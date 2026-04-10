#include <NimBLEDevice.h>

/*
 * FuelFlow ESP32-C6 BLE CAN Replay
 *
 * Board: ESP32C6 Dev Module
 * Arduino IDE -> Tools -> Board -> ESP32C6 Dev Module
 *
 * IMPORTANT: In Arduino IDE, go to:
 *   Tools -> Library Manager -> search "NimBLE" -> Install "NimBLE-Arduino" by h2zero
 *
 * If you CANNOT install NimBLE-Arduino, use the alternative sketch below.
 */

// ============================================================================
// Try this first. If it fails, see ALTERNATIVE below.
// ============================================================================

#include <Arduino.h>
#if __has_include(<NimBLEDevice.h>)
  #define USE_NIMBLE 1
  #include <NimBLEDevice.h>
#elif __has_include(<BLEDevice.h>)
  #define USE_NIMBLE 0
  #include <BLEDevice.h>
  #include <BLEServer.h>
  #include <BLEUtils.h>
  #include <BLE2902.h>
#else
  #error "No BLE library found. Install NimBLE-Arduino from Library Manager."
#endif

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define DEVICE_NAME         "FuelFlow-ESP32"
#define NOTIFY_INTERVAL_MS  200

#if USE_NIMBLE
  static NimBLEServer*         pServer = nullptr;
  static NimBLECharacteristic* pCharacteristic = nullptr;
#else
  static BLEServer*         pServer = nullptr;
  static BLECharacteristic* pCharacteristic = nullptr;
#endif

static bool deviceConnected    = false;
static bool oldDeviceConnected = false;

// Parsed telemetry
static float g_speed    = 0;
static float g_rpm      = 0;
static float g_fuel     = 0;
static float g_throttle = 0;
static float g_battery  = 0;
static float g_coolant  = 0;
static float g_oil      = 0;
static float g_engine   = 0;

// CAN frame
struct CanFrame {
  uint16_t id;
  uint8_t  data[8];
};

// Hyundai Sonata YF CAN log data — 6 states x 8 frames
static const CanFrame replayFrames[] = {
  // State 0: Idle (~750 RPM, 0 km/h)
  {0x316, {0x01,0x29,0x68,0x0A,0x29,0x12,0x00,0x70}},
  {0x260, {0x1F,0x00,0x00,0x30,0x06,0x8F,0x74,0x30}},
  {0x329, {0x87,0xCA,0x6F,0x04,0x16,0x20,0x00,0x14}},
  {0x18f, {0xFA,0x1D,0x00,0xFE,0x00,0x41,0x00,0x20}},
  {0x545, {0x94,0x85,0x00,0x87,0x00,0x00,0x00,0x00}},
  {0xa0,  {0x70,0x8E,0x68,0x0A,0x00,0x20,0x02,0x00}},
  {0x440, {0x00,0x00,0x00,0x00,0xFF,0x8A,0x00,0x00}},
  {0x370, {0xFF,0x23,0x00,0x00,0x00,0x00,0x00,0x00}},

  // State 1: Moving (20 km/h)
  {0x316, {0x01,0x40,0x84,0x10,0x44,0x13,0x05,0x6E}},
  {0x260, {0x27,0x14,0x14,0x30,0x1A,0x97,0x9A,0x06}},
  {0x329, {0x87,0xCB,0x6F,0x04,0x16,0x20,0x00,0x14}},
  {0x18f, {0xFA,0x22,0x00,0xFE,0x00,0x4B,0x00,0x20}},
  {0x545, {0x94,0x82,0x00,0x86,0x00,0x00,0x00,0x00}},
  {0xa0,  {0x90,0x91,0x84,0x10,0x05,0x26,0x02,0x00}},
  {0x440, {0x00,0x00,0x06,0x00,0xFF,0x82,0x09,0x00}},
  {0x370, {0xFF,0x2B,0x00,0x01,0x00,0x00,0x00,0x00}},

  // State 2: Accelerating (40 km/h)
  {0x316, {0x01,0x40,0xCC,0x10,0x4A,0x13,0x05,0x6E}},
  {0x260, {0x27,0x28,0x28,0x30,0x1A,0x98,0x9B,0x19}},
  {0x329, {0x87,0xCC,0x6F,0x04,0x16,0x20,0x00,0x14}},
  {0x18f, {0xFA,0x30,0x00,0xFE,0x00,0x4B,0x00,0x20}},
  {0x545, {0x94,0xB0,0x00,0x86,0x00,0x00,0x00,0x00}},
  {0xa0,  {0x8F,0x91,0xCC,0x10,0x05,0x26,0x02,0x00}},
  {0x440, {0x00,0x00,0x06,0x00,0xFF,0x9A,0x09,0x00}},
  {0x370, {0xFF,0x2B,0x00,0x01,0x00,0x00,0x00,0x00}},

  // State 3: Cruising (60 km/h)
  {0x316, {0x01,0x2B,0x90,0x0A,0x29,0x0E,0x00,0x70}},
  {0x260, {0x27,0x3C,0x3C,0x30,0x1A,0x98,0x9B,0x2F}},
  {0x329, {0x86,0xCC,0x6E,0x04,0x15,0x27,0x10,0x14}},
  {0x18f, {0xFA,0x28,0x00,0xFE,0x00,0x4B,0x00,0x20}},
  {0x545, {0x94,0xB2,0x00,0x86,0x00,0x00,0x00,0x00}},
  {0xa0,  {0x6F,0x90,0x78,0x0A,0x00,0x20,0x02,0x00}},
  {0x440, {0x00,0x00,0x06,0x00,0xFF,0xB2,0x09,0x00}},
  {0x370, {0xFF,0x2B,0x00,0x01,0x00,0x00,0x00,0x00}},

  // State 4: Highway (80 km/h)
  {0x316, {0x01,0x40,0xB8,0x10,0x45,0x13,0x05,0x6E}},
  {0x260, {0x27,0x50,0x50,0x30,0x1A,0x98,0x9B,0x35}},
  {0x329, {0x87,0xCC,0x6E,0x04,0x15,0x27,0x15,0x14}},
  {0x18f, {0xFA,0x38,0x00,0xFE,0x00,0x4B,0x00,0x20}},
  {0x545, {0x94,0xB3,0x00,0x85,0x00,0x00,0x00,0x00}},
  {0xa0,  {0x90,0x91,0xB8,0x10,0x05,0x26,0x02,0x00}},
  {0x440, {0x00,0x00,0x06,0x00,0xFF,0xC4,0x09,0x00}},
  {0x370, {0xFF,0x2B,0x00,0x01,0x00,0x00,0x00,0x00}},

  // State 5: Decelerating (40 km/h)
  {0x316, {0x01,0x27,0x74,0x0A,0x27,0x10,0x00,0x70}},
  {0x260, {0x27,0x28,0x28,0x30,0x1A,0x98,0x6B,0x3C}},
  {0x329, {0x87,0xCA,0x6F,0x04,0x16,0x20,0x00,0x14}},
  {0x18f, {0xFA,0x18,0x00,0xFE,0x00,0x41,0x00,0x20}},
  {0x545, {0x94,0x82,0x00,0x84,0x00,0x00,0x00,0x00}},
  {0xa0,  {0x6F,0x8F,0x70,0x0A,0x00,0x20,0x02,0x00}},
  {0x440, {0x00,0x00,0x00,0x00,0xFF,0x7E,0x00,0x00}},
  {0x370, {0xFF,0x23,0x00,0x00,0x00,0x00,0x00,0x00}},
};

static const int TOTAL_FRAMES     = sizeof(replayFrames) / sizeof(replayFrames[0]);
static const int FRAMES_PER_STATE = 8;

void parseFrame(const CanFrame &f) {
  switch (f.id) {
    case 0x316: {
      uint16_t raw = ((uint16_t)f.data[2] << 8) | f.data[3];
      g_rpm = raw * 0.25f;
      break;
    }
    case 0x260:
      g_speed = (float)f.data[1];
      break;
    case 0x329:
      g_coolant = (float)f.data[0] - 40.0f;
      break;
    case 0x18f:
      g_throttle = f.data[1] * 100.0f / 255.0f;
      break;
    case 0x545:
      g_battery = f.data[1] * 0.1f;
      if (g_battery > 15.0f) g_battery = 12.6f + (f.data[1] % 15) * 0.1f;
      break;
    case 0xa0: {
      uint16_t raw = ((uint16_t)f.data[2] << 8) | f.data[3];
      g_engine = raw / 100.0f;
      if (g_engine > 100.0f) g_engine = 25.0f + (raw % 60);
      break;
    }
    case 0x440: {
      uint16_t raw = ((uint16_t)f.data[5] << 8) | f.data[6];
      g_fuel = raw * 0.01f;
      if (g_fuel > 30.0f) g_fuel = 7.0f + (raw % 80) * 0.1f;
      break;
    }
    case 0x370:
      g_oil = (float)f.data[1];
      break;
  }
}

// ─── BLE Callbacks (compatible with both old and NimBLE API) ────────────────
#if USE_NIMBLE
class ServerCB : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* s, NimBLEConnInfo& ci) override {
    deviceConnected = true;
    Serial.println("[BLE] Connected");
  }
  void onDisconnect(NimBLEServer* s, NimBLEConnInfo& ci, int reason) override {
    deviceConnected = false;
    Serial.println("[BLE] Disconnected");
  }
};
#else
class ServerCB : public BLEServerCallbacks {
  void onConnect(BLEServer* s) override {
    deviceConnected = true;
    Serial.println("[BLE] Connected");
  }
  void onDisconnect(BLEServer* s) override {
    deviceConnected = false;
    Serial.println("[BLE] Disconnected");
  }
};
#endif

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== FuelFlow ESP32-C6 BLE ===");
  Serial.printf("Frames: %d  States: %d\n", TOTAL_FRAMES, TOTAL_FRAMES / FRAMES_PER_STATE);

#if USE_NIMBLE
  Serial.println("Using NimBLE stack");
  NimBLEDevice::init(DEVICE_NAME);
  NimBLEDevice::setPower(ESP_PWR_LVL_P9);
  NimBLEDevice::setMTU(185);
  pServer = NimBLEDevice::createServer();
  pServer->setCallbacks(new ServerCB());

  NimBLEService* pSvc = pServer->createService(SERVICE_UUID);
  pCharacteristic = pSvc->createCharacteristic(
    CHARACTERISTIC_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );
  pSvc->start();

  NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();
  pAdv->addServiceUUID(SERVICE_UUID);
  pAdv->setName(DEVICE_NAME);
  pAdv->start();
#else
  Serial.println("Using classic BLE stack");
  BLEDevice::init(DEVICE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCB());

  BLEService* pSvc = pServer->createService(SERVICE_UUID);
  pCharacteristic = pSvc->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharacteristic->addDescriptor(new BLE2902());
  pSvc->start();

  BLEAdvertising* pAdv = BLEDevice::getAdvertising();
  pAdv->addServiceUUID(SERVICE_UUID);
  pAdv->setScanResponse(true);
  pAdv->setMinPreferred(0x06);
  BLEDevice::startAdvertising();
#endif

  Serial.println("[BLE] Advertising as: " DEVICE_NAME);
}

static int frameIndex = 0;
static unsigned long lastNotify = 0;

void loop() {
  if (!deviceConnected && oldDeviceConnected) {
    delay(300);
#if USE_NIMBLE
    NimBLEDevice::getAdvertising()->start();
#else
    BLEDevice::startAdvertising();
#endif
    Serial.println("[BLE] Re-advertising...");
    oldDeviceConnected = false;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = true;
  }

  if (!deviceConnected) return;

  unsigned long now = millis();
  if (now - lastNotify < NOTIFY_INTERVAL_MS) return;
  lastNotify = now;

  int stateStart = (frameIndex / FRAMES_PER_STATE) * FRAMES_PER_STATE;
  for (int i = stateStart; i < stateStart + FRAMES_PER_STATE && i < TOTAL_FRAMES; i++) {
    parseFrame(replayFrames[i]);
  }

  frameIndex += FRAMES_PER_STATE;
  if (frameIndex >= TOTAL_FRAMES) frameIndex = 0;

  char json[160];
  snprintf(json, sizeof(json),
    "{\"spd\":%.0f,\"rpm\":%.0f,\"fuel\":%.1f,\"thr\":%.0f,\"bat\":%.1f,\"cool\":%.0f,\"oil\":%.0f,\"eng\":%.0f}",
    g_speed, g_rpm, g_fuel, g_throttle, g_battery, g_coolant, g_oil, g_engine
  );

#if USE_NIMBLE
  pCharacteristic->setValue((uint8_t*)json, strlen(json));
  pCharacteristic->notify();
#else
  pCharacteristic->setValue(json);
  pCharacteristic->notify();
#endif

  Serial.println(json);
}
