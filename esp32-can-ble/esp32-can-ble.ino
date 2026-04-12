#include <RTClib.h>

/*
 * FuelFlow ESP32 — CAN + BLE + SD + RTC
 * ══════════════════════════════════════════════════════════════════
 * Pinout:
 *   MCP2515  VCC  → 3.3V      MCP2515  GND → GND
 *   MCP2515  SCK  → 18        MCP2515  SI  → 23
 *   MCP2515  SO   → 19        MCP2515  CS  → 5
 *   MCP2515  INT  → 13
 *
 *   MicroSD  VCC  → 3.3V      MicroSD  GND → GND
 *   MicroSD  SCK  → 18        MicroSD  MOSI→ 23
 *   MicroSD  MISO → 19        MicroSD  CS  → 33
 *
 *   Tiny RTC VCC  → 5V/Vin    Tiny RTC GND → GND
 *   Tiny RTC SDA  → 21        Tiny RTC SCL → 22
 *
 * Libraries (Library Manager):
 *   • NimBLE-Arduino  by h2zero
 *   • MCP2515          by autowp
 *   • RTClib            by Adafruit
 *   • ArduinoJson      by Benoit Blanchon
 *   • SD               (built-in)
 *   • Wire             (built-in)
 *
 * BLE Characteristics:
 *   LIVE_UUID  (notify 200ms) — live telemetry JSON
 *   TRIP_UUID  (notify 5s + read) — current/today/week/month stats
 *   HIST_UUID  (read on demand) — last 50 completed trips for chart
 *
 * Trip rules:
 *   Only saved if engine ran for >120 seconds.
 *   SD file: /trips.csv  — one row per saved trip.
 *   On boot: last 120 rows loaded into RAM for stats.
 *
 * Always advertising — restarts after every disconnect.
 */

#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <SD.h>
#include <NimBLEDevice.h>
#include <ArduinoJson.h>
#include <mcp2515.h>

// ── Pins ─────────────────────────────────────────────────────────────────────
#define CAN_CS_PIN   5
#define CAN_INT_PIN  13
#define SD_CS_PIN    33

// ── BLE ──────────────────────────────────────────────────────────────────────
#define DEVICE_NAME    "FuelFlow-ESP32"
#define SERVICE_UUID   "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define LIVE_UUID      "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define TRIP_UUID      "beb5483e-36e1-4688-b7f5-ea07361b26a9"
#define HIST_UUID      "beb5483e-36e1-4688-b7f5-ea07361b26aa"

// ── Timing ───────────────────────────────────────────────────────────────────
#define NOTIFY_LIVE_MS   200
#define NOTIFY_TRIP_MS   5000
#define MIN_TRIP_MS      120000UL   // ignore trips shorter than 2 min
#define ACCUM_MS         500        // fuel/dist accumulator tick

// ── Fuel constants ────────────────────────────────────────────────────────────
static const float DISPL  = 2.0f, CYLS = 4.0f;
static const float DENS   = 740.0f, AFR = 14.7f;
static const float ATM    = 87.0f,  MAP_ID = 69.6f;

// ── SD ───────────────────────────────────────────────────────────────────────
#define TRIPS_FILE "/trips.csv"
// CSV columns: unix_ts,dur_s,dist_km,fuel_l,avg_spd,avg_rpm

// ── Trip record ───────────────────────────────────────────────────────────────
struct TripRec {
  uint32_t ts;       // unix start timestamp
  uint32_t dur_s;
  float    dist_km;
  float    fuel_l;
  uint8_t  avg_spd;
  uint16_t avg_rpm;
};

#define MAX_HIST 120
static TripRec  tripHist[MAX_HIST];
static int      histHead  = 0;
static int      histCount = 0;

// ── Current trip accumulators ─────────────────────────────────────────────────
static bool     tripActive    = false;
static uint32_t tripStartMs   = 0;
static uint32_t tripStartUnix = 0;
static float    tripDist      = 0.0f;
static float    tripFuel      = 0.0f;
static float    tripSpdSum    = 0.0f;
static float    tripRpmSum    = 0.0f;
static uint32_t tripSamples   = 0;

// ── Live telemetry (written from CAN, read from loop) ─────────────────────────
static volatile float g_rpm = 0, g_spd = 0, g_tps = 0;
static volatile float g_ect = 20, g_iat = -12;
static volatile bool  g_run = false;
static float g_lph = 0, g_fuel = 0;

// ── BLE ──────────────────────────────────────────────────────────────────────
static NimBLEServer*         pServer  = nullptr;
static NimBLECharacteristic* pLive    = nullptr;
static NimBLECharacteristic* pTrip    = nullptr;
static NimBLECharacteristic* pHist    = nullptr;
static bool bleConnected = false;

// ── Hardware ──────────────────────────────────────────────────────────────────
MCP2515   mcp2515(CAN_CS_PIN);
RTC_DS1307 rtc;
static bool sdOk  = false;
static bool rtcOk = false;


// ════════════════════════════════════════════════════════════════════════════
// MCP2515 — raw CNF write for 12 MHz / 500 kbps
// BRP=0 SJW=1 Prop=2 PS1=6 PS2=3  SP=75%
// ════════════════════════════════════════════════════════════════════════════
static void mcp_writeReg(uint8_t a, uint8_t v) {
  SPI.beginTransaction(SPISettings(10000000, MSBFIRST, SPI_MODE0));
  digitalWrite(CAN_CS_PIN, LOW);
  SPI.transfer(0x02); SPI.transfer(a); SPI.transfer(v);
  digitalWrite(CAN_CS_PIN, HIGH);
  SPI.endTransaction();
}
static void canInit12MHz500k() {
  mcp2515.reset(); delay(10);
  mcp_writeReg(0x2A, 0x00);   // CNF1
  mcp_writeReg(0x29, 0xA9);   // CNF2
  mcp_writeReg(0x28, 0x02);   // CNF3
  mcp2515.setNormalMode();
}


// ════════════════════════════════════════════════════════════════════════════
// Fuel model
// ════════════════════════════════════════════════════════════════════════════
static float ve(float r) {
  if (r<500) return 0; if (r<1000) return .65f; if (r<2000) return .76f;
  if (r<3000) return .83f; if (r<4000) return .88f; if (r<5000) return .90f;
  return .86f;
}
static float coldFactor(float e) {
  if (e>=80) return 1.f;
  if (e>=60) return 1.f+(80-e)/80*.15f;
  if (e>=40) return 1.f+(80-e)/80*.30f;
  return             1.f+(80-e)/80*.50f;
}
static float calcLph(float rpm, float tps, float iat, float ect) {
  if (rpm<200) return 0;
  float ik=iat+273.15f, mk=MAP_ID+(ATM-MAP_ID)*(tps/100.f);
  float rho=(mk*1000)/(287.f*ik), vol=(DISPL/CYLS)/1000.f;
  float mass=vol*rho*ve(rpm)*(293.15f/ik), fg=mass/AFR;
  float cps=(rpm/60.f)*.5f*CYLS;
  return max(0.f,(fg*cps*1000/DENS)*3600.f*coldFactor(ect));
}


// ════════════════════════════════════════════════════════════════════════════
// CAN decode
// ════════════════════════════════════════════════════════════════════════════
static void decodeFrame(uint32_t id, const uint8_t* b, uint8_t len) {
  uint8_t d[8]={0}; memcpy(d,b,min((int)len,8));
  switch (id & 0x7FF) {
    case 0x43F: g_rpm=((uint16_t)d[6]<<8|d[5])*.25f; break;
    case 0x440: g_spd=(float)d[2];                    break;
    case 0x329: g_ect=d[1]*.75f-48; g_tps=d[6]/2.55f; break;
    case 0x18F: g_iat=(float)(d[1]-40);               break;
    case 0x260: g_run=(d[3]==0x30);                    break;
  }
}


// ════════════════════════════════════════════════════════════════════════════
// RTC helpers
// ════════════════════════════════════════════════════════════════════════════
static uint32_t nowUnix() {
  if (!rtcOk) return 0;
  return rtc.now().unixtime();
}
static String nowStr() {
  if (!rtcOk) return "unknown";
  DateTime n = rtc.now();
  char buf[20];
  snprintf(buf,sizeof(buf),"%04d-%02d-%02d %02d:%02d:%02d",
    n.year(),n.month(),n.day(),n.hour(),n.minute(),n.second());
  return String(buf);
}
// Epoch helpers — weeks start Monday
static bool isSameDay(uint32_t a, uint32_t b) {
  return (a/86400) == (b/86400);
}
static bool isSameWeek(uint32_t a, uint32_t b) {
  // ISO week: days since epoch / 7, offset by Thursday epoch (Thu 1970-01-01)
  return ((a/86400+3)/7) == ((b/86400+3)/7);
}
static bool isSameMonth(uint32_t a, uint32_t b) {
  DateTime da(a), db(b);
  return da.year()==db.year() && da.month()==db.month();
}


// ════════════════════════════════════════════════════════════════════════════
// SD — trip persistence
// ════════════════════════════════════════════════════════════════════════════
static void pushHist(const TripRec& r) {
  tripHist[histHead] = r;
  histHead = (histHead+1) % MAX_HIST;
  if (histCount < MAX_HIST) histCount++;
}

static void sdSaveTrip(const TripRec& r) {
  if (!sdOk) return;
  File f = SD.open(TRIPS_FILE, FILE_APPEND);
  if (!f) return;
  char row[80];
  snprintf(row,sizeof(row),"%lu,%lu,%.3f,%.4f,%u,%u\n",
    (unsigned long)r.ts, (unsigned long)r.dur_s,
    r.dist_km, r.fuel_l, (unsigned)r.avg_spd, (unsigned)r.avg_rpm);
  f.print(row);
  f.close();
}

static void sdLoadHistory() {
  if (!sdOk) return;
  if (!SD.exists(TRIPS_FILE)) return;
  File f = SD.open(TRIPS_FILE, FILE_READ);
  if (!f) return;

  // Count lines so we can skip to last MAX_HIST
  int total = 0;
  while (f.available()) { if (f.read()=='\n') total++; }
  f.seek(0);

  int skip = max(0, total - MAX_HIST);
  int skipped = 0;
  while (f.available()) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() < 5) continue;
    if (skipped++ < skip) continue;
    // parse: unix_ts,dur_s,dist_km,fuel_l,avg_spd,avg_rpm
    TripRec r = {0};
    int col = 0; int start = 0;
    for (int i = 0; i <= (int)line.length(); i++) {
      if (i == (int)line.length() || line[i] == ',') {
        String tok = line.substring(start, i);
        switch (col++) {
          case 0: r.ts      = (uint32_t)tok.toInt();   break;
          case 1: r.dur_s   = (uint32_t)tok.toInt();   break;
          case 2: r.dist_km = tok.toFloat();            break;
          case 3: r.fuel_l  = tok.toFloat();            break;
          case 4: r.avg_spd = (uint8_t)tok.toInt();    break;
          case 5: r.avg_rpm = (uint16_t)tok.toInt();   break;
        }
        start = i+1;
      }
    }
    if (r.ts > 0) pushHist(r);
  }
  f.close();
  Serial.printf("[SD] Loaded %d trip records\n", histCount);
}


// ════════════════════════════════════════════════════════════════════════════
// Trip stats aggregation
// Scans histHist ring buffer; also adds current active trip into "trip" range.
// Returns JSON string.
// ════════════════════════════════════════════════════════════════════════════
struct Agg { float dist=0,fuel=0; uint32_t dur=0; uint32_t spdSum=0; int n=0; };

static void aggAdd(Agg& a, const TripRec& r) {
  a.dist   += r.dist_km;
  a.fuel   += r.fuel_l;
  a.dur    += r.dur_s;
  a.spdSum += r.avg_spd;
  a.n++;
}

static String buildTripJson() {
  uint32_t now = nowUnix();

  Agg aDay, aWeek, aMonth;
  int total = min(histCount, MAX_HIST);
  int start = (histCount >= MAX_HIST) ? histHead : 0;

  for (int i = 0; i < total; i++) {
    const TripRec& r = tripHist[(start+i) % MAX_HIST];
    if (now > 0) {
      if (isSameDay(r.ts, now))   aggAdd(aDay,   r);
      if (isSameWeek(r.ts, now))  aggAdd(aWeek,  r);
      if (isSameMonth(r.ts, now)) aggAdd(aMonth, r);
    } else {
      // No RTC — bucket everything into "month" so data isn't lost
      aggAdd(aMonth, r);
    }
  }

  // Current active trip (not yet saved)
  float curDist  = tripDist;
  float curFuel  = tripFuel;
  uint32_t curDur = tripActive ? (millis()-tripStartMs)/1000 : 0;
  float curSpd   = tripSamples ? tripSpdSum/tripSamples : 0;
  float curRpm   = tripSamples ? tripRpmSum/tripSamples : 0;
  float curL100  = (curDist>0.1f) ? curFuel/curDist*100.f : g_fuel;

  // If active trip started today/week/month, add it to aggregates too
  if (tripActive && curDur > 10) {
    Agg tmp; tmp.dist=curDist; tmp.fuel=curFuel; tmp.dur=curDur;
    tmp.spdSum=(uint32_t)curSpd; tmp.n=1;
    if (now>0 && isSameDay(tripStartUnix,now))   aggAdd(aDay,   {tripStartUnix,(uint32_t)curDur,curDist,curFuel,(uint8_t)curSpd,(uint16_t)curRpm});
    if (now>0 && isSameWeek(tripStartUnix,now))  aggAdd(aWeek,  {tripStartUnix,(uint32_t)curDur,curDist,curFuel,(uint8_t)curSpd,(uint16_t)curRpm});
    if (now>0 && isSameMonth(tripStartUnix,now)) aggAdd(aMonth, {tripStartUnix,(uint32_t)curDur,curDist,curFuel,(uint8_t)curSpd,(uint16_t)curRpm});
  }

  auto l100 = [](const Agg& a) -> float {
    return (a.dist>0.1f) ? a.fuel/a.dist*100.f : 0.f;
  };
  auto avgSpd = [](const Agg& a) -> float {
    return a.n ? (float)a.spdSum/a.n : 0.f;
  };

  char buf[512];
  snprintf(buf, sizeof(buf),
    "{\"trip\":{\"d\":%.2f,\"f\":%.3f,\"t\":%lu,\"s\":%.0f,\"l\":%.1f},"
    "\"day\":{\"d\":%.1f,\"f\":%.2f,\"t\":%lu,\"s\":%.0f,\"l\":%.1f,\"n\":%d},"
    "\"week\":{\"d\":%.1f,\"f\":%.2f,\"t\":%lu,\"s\":%.0f,\"l\":%.1f,\"n\":%d},"
    "\"month\":{\"d\":%.1f,\"f\":%.2f,\"t\":%lu,\"s\":%.0f,\"l\":%.1f,\"n\":%d},"
    "\"ts\":\"%s\"}",
    curDist, curFuel, (unsigned long)curDur, curSpd, curL100,
    aDay.dist,   aDay.fuel,   (unsigned long)aDay.dur,   avgSpd(aDay),   l100(aDay),   aDay.n,
    aWeek.dist,  aWeek.fuel,  (unsigned long)aWeek.dur,  avgSpd(aWeek),  l100(aWeek),  aWeek.n,
    aMonth.dist, aMonth.fuel, (unsigned long)aMonth.dur, avgSpd(aMonth), l100(aMonth), aMonth.n,
    nowStr().c_str()
  );
  return String(buf);
}

// Last 50 trips as array for chart bars (oldest→newest)
static String buildHistJson() {
  int total = min(histCount, MAX_HIST);
  int count = min(total, 50);
  int start = (histCount >= MAX_HIST)
              ? (histHead + MAX_HIST - count) % MAX_HIST
              : max(0, histCount - count);
  String out = "[";
  for (int i = 0; i < count; i++) {
    const TripRec& r = tripHist[(start+i) % MAX_HIST];
    float l100 = (r.dist_km > 0.1f) ? r.fuel_l/r.dist_km*100.f : 0.f;
    char tmp[80];
    snprintf(tmp, sizeof(tmp),
      "%s{\"ts\":%lu,\"d\":%.2f,\"f\":%.3f,\"l\":%.1f,\"s\":%u,\"t\":%lu}",
      i?",":"",
      (unsigned long)r.ts, r.dist_km, r.fuel_l, l100,
      (unsigned)r.avg_spd, (unsigned long)r.dur_s);
    out += tmp;
  }
  out += ']';
  return out;
}


// ════════════════════════════════════════════════════════════════════════════
// Trip lifecycle
// ════════════════════════════════════════════════════════════════════════════
static void tripBegin() {
  tripActive    = true;
  tripStartMs   = millis();
  tripStartUnix = nowUnix();
  tripDist = tripFuel = tripSpdSum = tripRpmSum = 0;
  tripSamples = 0;
  Serial.println("[TRIP] Started");
}

static void tripEnd(float rpm, float spd) {
  tripActive = false;
  uint32_t durMs = millis() - tripStartMs;
  if (durMs < MIN_TRIP_MS) {
    Serial.printf("[TRIP] Discarded — only %lus\n", (unsigned long)durMs/1000);
    return;
  }
  TripRec r;
  r.ts      = tripStartUnix;
  r.dur_s   = durMs / 1000;
  r.dist_km = tripDist;
  r.fuel_l  = tripFuel;
  r.avg_spd = tripSamples ? (uint8_t)(tripSpdSum/tripSamples) : (uint8_t)spd;
  r.avg_rpm = tripSamples ? (uint16_t)(tripRpmSum/tripSamples) : (uint16_t)rpm;
  pushHist(r);
  sdSaveTrip(r);
  Serial.printf("[TRIP] Saved — %.1f km, %.2f L, %us\n",
    r.dist_km, r.fuel_l, (unsigned)r.dur_s);
}


// ════════════════════════════════════════════════════════════════════════════
// BLE
// ════════════════════════════════════════════════════════════════════════════
class ServerCB : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer*, NimBLEConnInfo&) override {
    bleConnected = true;
    Serial.println("[BLE] Connected");
    // Keep advertising so other devices can still discover
    NimBLEDevice::getAdvertising()->start();
  }
  void onDisconnect(NimBLEServer*, NimBLEConnInfo&, int) override {
    bleConnected = false;
    NimBLEDevice::getAdvertising()->start();
    Serial.println("[BLE] Disconnected — re-advertising");
  }
};

class TripReadCB : public NimBLECharacteristicCallbacks {
  void onRead(NimBLECharacteristic* c, NimBLEConnInfo&) override {
    String j = buildTripJson();
    c->setValue((uint8_t*)j.c_str(), j.length());
  }
};

class HistReadCB : public NimBLECharacteristicCallbacks {
  void onRead(NimBLECharacteristic* c, NimBLEConnInfo&) override {
    String j = buildHistJson();
    c->setValue((uint8_t*)j.c_str(), j.length());
    Serial.printf("[BLE] History read: %d bytes\n", j.length());
  }
};


// ════════════════════════════════════════════════════════════════════════════
// Setup
// ════════════════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== FuelFlow ESP32 ===");

  // RTC
  Wire.begin(21, 22);
  if (rtc.begin()) {
    rtcOk = true;
    if (!rtc.isrunning()) {
      // First boot with a dead battery — set to compile time
      rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
      Serial.println("[RTC] Was stopped — set to compile time");
    }
    Serial.printf("[RTC] Time: %s\n", nowStr().c_str());
  } else {
    Serial.println("[RTC] Not found — timestamps unavailable");
  }

  // SD
  if (SD.begin(SD_CS_PIN)) {
    sdOk = true;
    sdLoadHistory();
    Serial.println("[SD] Ready");
  } else {
    Serial.println("[SD] Not found — data won't persist");
  }

  // MCP2515
  pinMode(CAN_CS_PIN, OUTPUT); digitalWrite(CAN_CS_PIN, HIGH);
  SPI.begin();
  canInit12MHz500k();
  pinMode(CAN_INT_PIN, INPUT);
  Serial.println("[CAN] MCP2515 ready — 12 MHz 500 kbps");

  // BLE
  NimBLEDevice::init(DEVICE_NAME);
  NimBLEDevice::setPower(ESP_PWR_LVL_P9);
  NimBLEDevice::setMTU(512);

  pServer = NimBLEDevice::createServer();
  pServer->setCallbacks(new ServerCB());
  pServer->advertiseOnDisconnect(false);   // we handle it manually

  NimBLEService* svc = pServer->createService(SERVICE_UUID);

  pLive = svc->createCharacteristic(LIVE_UUID,
            NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);

  pTrip = svc->createCharacteristic(TRIP_UUID,
            NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  pTrip->setCallbacks(new TripReadCB());

  pHist = svc->createCharacteristic(HIST_UUID,
            NIMBLE_PROPERTY::READ);
  pHist->setCallbacks(new HistReadCB());

  svc->start();

  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->setName(DEVICE_NAME);
  adv->start();
  Serial.println("[BLE] Advertising — always on");
}


// ════════════════════════════════════════════════════════════════════════════
// Loop
// ════════════════════════════════════════════════════════════════════════════
static unsigned long lastLive   = 0;
static unsigned long lastTrip   = 0;
static unsigned long lastAccum  = 0;
static bool prevRun = false;

void loop() {
  unsigned long now = millis();

  // ── CAN ────────────────────────────────────────────────────────────────
  while (digitalRead(CAN_INT_PIN) == LOW) {
    struct can_frame f;
    if (mcp2515.readMessage(&f) == MCP2515::ERROR_OK)
      decodeFrame(f.can_id, f.data, f.can_dlc);
    else break;
  }

  // ── Snapshot ───────────────────────────────────────────────────────────
  noInterrupts();
  float rpm=g_rpm, spd=g_spd, tps=g_tps, ect=g_ect, iat=g_iat;
  bool  run=g_run;
  interrupts();

  // ── Fuel calc ──────────────────────────────────────────────────────────
  if (run) {
    g_lph  = calcLph(rpm, tps, iat, ect);
    g_fuel = (spd>3.f) ? constrain(g_lph/spd*100.f, 0.f, 30.f) : g_lph;
  } else {
    g_lph = g_fuel = 0;
  }

  // ── Trip state machine ─────────────────────────────────────────────────
  if (run && !prevRun)      tripBegin();
  if (!run && prevRun)      tripEnd(rpm, spd);
  prevRun = run;

  // ── Accumulate trip stats ──────────────────────────────────────────────
  if (tripActive && now - lastAccum >= ACCUM_MS) {
    float dt = (now - lastAccum) / 3600000.f;   // hours
    lastAccum = now;
    tripDist   += spd  * dt;
    tripFuel   += g_lph * dt;
    tripSpdSum += spd;
    tripRpmSum += rpm;
    tripSamples++;
  } else if (!tripActive) {
    lastAccum = now;
  }

  // ── BLE live notify ────────────────────────────────────────────────────
  if (now - lastLive >= NOTIFY_LIVE_MS) {
    lastLive = now;
    // dtcs: populate from CAN/OBD when implemented; keep array for app parsing
    char json[256];
    snprintf(json, sizeof(json),
      "{\"spd\":%.0f,\"rpm\":%.0f,\"fuel\":%.1f,\"thr\":%.0f,"
      "\"bat\":0,\"cool\":%.0f,\"oil\":0,\"eng\":0,"
      "\"iat\":%.0f,\"run\":%d,\"lph\":%.2f,\"dtcs\":[]}",
      spd, rpm, g_fuel, tps, ect, iat, run?1:0, g_lph);
    pLive->setValue((uint8_t*)json, strlen(json));
    if (bleConnected) pLive->notify();
    Serial.println(json);
  }

  // ── BLE trip stats notify ──────────────────────────────────────────────
  if (now - lastTrip >= NOTIFY_TRIP_MS) {
    lastTrip = now;
    String tj = buildTripJson();
    pTrip->setValue((uint8_t*)tj.c_str(), tj.length());
    if (bleConnected) pTrip->notify();
  }
}
