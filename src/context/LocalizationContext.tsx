import React, { createContext, useContext, useState } from 'react';

export type Language = 'mn' | 'en' | 'ja';

export interface Translations {
  [key: string]: string;
}

export interface LocalizationContextType {
  language: Language;
  t: (key: string) => string;
  setLanguage: (lang: Language) => void;
}

const translations: Record<Language, Translations> = {
  en: {
    // Common
    loading: 'Loading...',
    loading_telemetry: 'Loading telemetry...',
    loading_diagnostics: 'Loading diagnostics...',
    loading_reminders: 'Loading reminders...',
    no_signal: 'NO SIGNAL',
    live: 'LIVE',
    permission_error: 'No read permission — check Firebase Console → Firestore Rules.',
    no_connection: 'Vehicle not connected — connect ESP32 in Connect tab',
    no_connection_reminders: 'Vehicle not connected — no data yet',
    system_status: 'SYSTEM STATUS',
    close: 'Close',

    // Login
    login_title: 'FuelFlow',
    login_email: 'Email address',
    login_password: 'Password',
    login_button: 'Log In',
    signup_button: 'Sign Up',
    login_or: 'or',
    login_google: 'Sign in with Google',
    login_tagline: 'Track your fuel consumption smartly',
    login_warning_fields: 'Please enter email and password.',

    // Dashboard
    dashboard_title: 'Dashboard',
    speed: 'Speed',
    speed_unit: 'KM/H',
    rpm: 'RPM',
    fuel_consumption: 'Fuel Consumption',
    fuel_consumption_unit: 'L/100km',
    throttle_position: 'Throttle Position',
    throttle_unit: '%',
    battery: 'Battery',
    battery_unit: 'V',
    coolant: 'Coolant',
    coolant_unit: '°C',
    oil_pressure: 'Oil Pressure',
    oil_pressure_unit: 'PSI',
    engine_load: 'Engine Load',
    engine_load_unit: '%',
    session_averages: 'SESSION AVERAGES (BLE)',
    avg_speed: 'Avg speed',
    avg_rpm: 'Avg RPM',
    avg_fuel: 'Avg fuel',

    // Diagnostics
    fault_codes: 'FAULT CODES',
    critical_label: 'CRITICAL',
    warning_label: 'WARNING',
    total_label: 'TOTAL',
    status_label: 'STATUS',
    all_systems_normal: 'All Systems Normal',
    no_active_faults: 'No active fault codes detected',
    obd_protocol: 'OBD-II Protocol',
    permission_needed: 'Permission Required',
    permission_check_rules: 'Check Firebase Console → Firestore Rules.',
    search_faults: 'Search codes…',
    export_json: 'Export JSON',
    clear_faults: 'Clear stored codes',
    clear_faults_confirm: 'Remove all fault codes from the cloud for this vehicle?',
    fault_search_empty: 'No codes match your search.',
    diagnostics_not_connected: 'Vehicle link not active',
    diagnostics_connect_hint:
      'Connect your FuelFlow ESP32 on the Connect tab to read live fault codes from the car.',

    // Reminders
    reminders_header: 'REMINDERS',
    oil_remaining: 'OIL REMAINING',
    oil_change_needed: 'CHANGE NEEDED',
    oil_type_label: 'OIL TYPE',
    last_oil_change: 'LAST CHANGE',
    fuel_label: 'FUEL',
    fuel_low: 'LOW',
    capacity_label: 'CAPACITY',
    consumption_label: 'CONSUMPTION',
    nearest_station: 'NEAREST STATION',
    next_service: 'NEXT SERVICE',
    tips_header: 'TIPS',
    tip_1:
      'Inflate tires to your vehicle’s recommended pressure (door jamb label). Under-inflated tires increase rolling resistance and fuel use.',
    tip_2:
      'Avoid long idling — turn the engine off if you’ll be stopped for more than about a minute (common U.S. DOE guidance).',
    tip_3:
      'Accelerate and brake smoothly; aggressive driving can lower fuel economy substantially versus steady driving.',
    tip_4:
      'Remove roof racks and extra weight when you don’t need them — added mass and drag reduce miles per gallon.',
    tip_5:
      'Use the engine oil viscosity grade recommended by your manufacturer for efficiency and engine protection.',
    tip_6:
      'Combine errands into one trip when possible — several cold starts and short hops use more fuel than one longer drive.',
    map_refresh: 'Refresh map',

    // Settings
    account: 'Account',
    logout: 'Logout',
    preferences: 'Preferences',
    language: 'Language',
    metric_units: 'Metric Units',
    notifications: 'Notifications',
    fault_alerts: 'Fault Alerts',
    maintenance_reminders: 'Maintenance Reminders',
    fault_notifications: 'Push notifications for fault codes',
    service_notifications: 'Service interval notifications',

    // Navigation
    nav_dashboard: 'Dashboard',
    nav_connect: 'Connect',
    nav_diagnostics: 'Diagnostics',
    nav_reminders: 'Reminders',
    nav_settings: 'Settings',

    // Connect
    connect_search: 'SEARCH DEVICES',
    connect_search_ph: 'Filter by name or ID',
    connect_scan: 'SCAN',
    connect_scan_btn: 'Scan nearby (12s)',
    connect_quick: 'Quick connect',
    connect_devices: 'FOUND DEVICES',
    connect_scanning: 'Scanning…',
    connect_no_devices: 'No devices yet — tap Scan',
    connect_status: 'CONNECTION',
    connect_connected: 'Connected',
    connect_disconnected: 'Not connected',
    connect_state_scanning: 'Scanning for FuelFlow…',
    connect_state_connecting: 'Connecting…',
    connect_export_section: 'EXPORT JSON',
    connect_export_telemetry: 'Live telemetry',
    connect_export_diagnostics: 'Diagnostics snapshot',
    connect_export_combined: 'Telemetry + diagnostics',
    connect_export: 'Export',
    connect_share_hint: 'Use Save to Files or share to another app from the Android sheet.',
  },

  mn: {
    // Common
    loading: 'Ачааллаж байна...',
    loading_telemetry: 'Телеметри ачааллаж байна...',
    loading_diagnostics: 'Оношлогоо ачааллаж байна...',
    loading_reminders: 'Сануулга ачааллаж байна...',
    no_signal: 'ДОХИОГҮЙ',
    live: 'ШУУД',
    permission_error: 'Өгөгдөл уншах зөвшөөрөл байхгүй — Firebase Console → Firestore Rules шалгана уу.',
    no_connection: 'Машин холбогдоогүй — Connect табаас ESP32 холбоно уу',
    no_connection_reminders: 'Машин холбогдоогүй — Өгөгдөл ирээгүй байна',
    system_status: 'СИСТЕМИЙН ТӨЛӨВ',
    close: 'Хаах',

    // Login
    login_title: 'FuelFlow',
    login_email: 'Имэйл хаяг',
    login_password: 'Нууц үг',
    login_button: 'Нэвтрэх',
    signup_button: 'Бүртгүүлэх',
    login_or: 'эсвэл',
    login_google: 'Google-ээр нэвтрэх',
    login_tagline: 'Түлшний зарцуулалтаа ухаалгаар хянаарай',
    login_warning_fields: 'Имэйл болон нууц үгээ оруулна уу.',

    // Dashboard
    dashboard_title: 'Хяналтын самбар',
    speed: 'Хурд',
    speed_unit: 'КМ/Ц',
    rpm: 'Эрг/мин',
    fuel_consumption: 'Түлшний зарцуулалт',
    fuel_consumption_unit: 'Л/100км',
    throttle_position: 'Хаалтны байрлал',
    throttle_unit: '%',
    battery: 'Аккумлятор',
    battery_unit: 'В',
    coolant: 'Хөргөлтийн шингэн',
    coolant_unit: '°C',
    oil_pressure: 'Тосны даралт',
    oil_pressure_unit: 'PSI',
    engine_load: 'Моторын ачаалал',
    engine_load_unit: '%',
    session_averages: 'ДУУСГАЛТЫН ДУНДАЖ (BLE)',
    avg_speed: 'Дундаж хурд',
    avg_rpm: 'Дундаж эргэлт',
    avg_fuel: 'Дундаж түлш',

    // Diagnostics
    fault_codes: 'АЛДААНЫ КОДУУД',
    critical_label: 'ШУУРХАЙ',
    warning_label: 'САНУУЛГА',
    total_label: 'НИЙТ',
    status_label: 'ТӨЛӨВ',
    all_systems_normal: 'Бүх систем хэвийн',
    no_active_faults: 'Идэвхтэй алдааны код илэрсэнгүй',
    obd_protocol: 'OBD-II протокол',
    permission_needed: 'Зөвшөөрөл шаардлагатай',
    permission_check_rules: 'Firebase Console → Firestore Rules-ыг шалгана уу.',
    search_faults: 'Код хайх…',
    export_json: 'JSON экспорт',
    clear_faults: 'Кодыг цэвэрлэх',
    clear_faults_confirm: 'Бүх алдааны кодыг устгах уу?',
    fault_search_empty: 'Таны хайлтад тохирох код алга.',
    diagnostics_not_connected: 'Тээврийн холбоос идэвхгүй',
    diagnostics_connect_hint:
      'Машины шууд алдааны кодыг уншихын тулд Connect табаас FuelFlow ESP32-оо холбоно уу.',

    // Reminders
    reminders_header: 'САНУУЛГА',
    oil_remaining: 'ТОСНЫ ҮЛДЭГДЭЛ',
    oil_change_needed: 'СОЛИХ ШААРДЛАГАТАЙ',
    oil_type_label: 'ТОС ТӨРӨЛ',
    last_oil_change: 'СҮҮЛИЙН СОЛИЛТ',
    fuel_label: 'ШАТАХУУН',
    fuel_low: 'БАГА БАЙНА',
    capacity_label: 'БАГТААМЖ',
    consumption_label: 'ЗАРЦУУЛАЛТ',
    nearest_station: 'ОЙРЫН ШАТАХУУН',
    next_service: 'ДАРААГИЙН ЗАСВАР',
    tips_header: 'ЗӨВЛӨМЖ',
    tip_1:
      'Дугуйн даралтыг машины зөвлөмжийн дагуу (их биеийн шошго) барина уу — бага даралт элэгдэл, түлшний зарцуулалтыг нэмэгдүүлнэ.',
    tip_2:
      'Удаан хоосон ажиллуулахгүй — ~1 минутаас илүү зогсолтонд хөдөлгүүр унтраана (ерөнхий зөвлөмж).',
    tip_3:
      'Жигд хурдасч, зөөлөн тормозлох нь түлшний үр ашгийг нэмэгдүүлнэ; тэвэгүй жолоо ихээр бууруулна.',
    tip_4:
      'Шаардлагагүй ачаа, дээврийн түгжээг авна — жин, эсэргүүцэл түлш иднэ.',
    tip_5:
      'Үйлдвэрлэгчийн зөвлөсөн тосны ангиллыг ашиглана уу — зөв тос хэмнэлт, хамгаалалтад тустай.',
    tip_6:
      'Ажлаа нэг аялалд нэгтгэх нь хүйтэн асах тоог багасгаж, нийт км-ийг оновчтой болгоно.',
    map_refresh: 'Газрын зураг шинэчлэх',

    // Settings
    account: 'Бүртгэл',
    logout: 'Гарах',
    preferences: 'Тохиргоо',
    language: 'Хэл',
    metric_units: 'Метрик нэгж',
    notifications: 'Мэдэгдэл',
    fault_alerts: 'Алдааны мэдэгдэл',
    maintenance_reminders: 'Засварын сануулга',
    fault_notifications: 'Алдааны кодын мэдэгдэл авах',
    service_notifications: 'Засварын мэдэгдэл авах',

    // Navigation
    nav_dashboard: 'Самбар',
    nav_connect: 'Холболт',
    nav_diagnostics: 'Оношлогоо',
    nav_reminders: 'Сануулга',
    nav_settings: 'Тохиргоо',

    connect_search: 'ТӨХӨӨРӨМЖ ХАЙХ',
    connect_search_ph: 'Нэр эсвэл ID-ээр шүүх',
    connect_scan: 'СКАН',
    connect_scan_btn: 'Ойрын төхөөрөмж (12с)',
    connect_quick: 'Түргэн холболт',
    connect_devices: 'ОЛДСОН ТӨХӨӨРӨМЖ',
    connect_scanning: 'Скан хийж байна…',
    connect_no_devices: 'Төхөөрөмж олдсонгүй — Скан дарна уу',
    connect_status: 'ХОЛБОЛТ',
    connect_connected: 'Холбогдсон',
    connect_disconnected: 'Салсан',
    connect_state_scanning: 'FuelFlow хайж байна…',
    connect_state_connecting: 'Холбож байна…',
    connect_export_section: 'JSON ЭКСПОРТ',
    connect_export_telemetry: 'Шууд телеметри',
    connect_export_diagnostics: 'Оношлогоо',
    connect_export_combined: 'Телеметри + оношлогоо',
    connect_export: 'Экспорт',
    connect_share_hint: 'Android цэснээс хадгалах эсвэл хуваалцах.',
  },

  ja: {
    // Common
    loading: '読み込み中...',
    loading_telemetry: 'テレメトリを読み込み中...',
    loading_diagnostics: '診断を読み込み中...',
    loading_reminders: 'リマインダーを読み込み中...',
    no_signal: '信号なし',
    live: 'ライブ',
    permission_error: '読み取り権限がありません — Firebase Console → Firestore Rulesを確認してください。',
    no_connection: '車両未接続 — ConnectタブでESP32に接続してください',
    no_connection_reminders: '車両未接続 — データがありません',
    system_status: 'システム状態',
    close: '閉じる',

    // Login
    login_title: 'FuelFlow',
    login_email: 'メールアドレス',
    login_password: 'パスワード',
    login_button: 'ログイン',
    signup_button: 'サインアップ',
    login_or: 'または',
    login_google: 'Googleでログイン',
    login_tagline: '燃料消費をスマートに管理',
    login_warning_fields: 'メールとパスワードを入力してください。',

    // Dashboard
    dashboard_title: 'ダッシュボード',
    speed: '速度',
    speed_unit: 'KM/H',
    rpm: '回転数',
    fuel_consumption: '燃費',
    fuel_consumption_unit: 'L/100km',
    throttle_position: 'スロットル位置',
    throttle_unit: '%',
    battery: 'バッテリー',
    battery_unit: 'V',
    coolant: '冷却水',
    coolant_unit: '°C',
    oil_pressure: '油圧',
    oil_pressure_unit: 'PSI',
    engine_load: 'エンジン負荷',
    engine_load_unit: '%',
    session_averages: 'セッション平均 (BLE)',
    avg_speed: '平均速度',
    avg_rpm: '平均回転数',
    avg_fuel: '平均燃費',

    // Diagnostics
    fault_codes: '故障コード',
    critical_label: '重大',
    warning_label: '警告',
    total_label: '合計',
    status_label: '状態',
    all_systems_normal: '全システム正常',
    no_active_faults: 'アクティブな故障コードはありません',
    obd_protocol: 'OBD-IIプロトコル',
    permission_needed: '権限が必要です',
    permission_check_rules: 'Firebase Console → Firestore Rulesを確認してください。',
    search_faults: 'コードを検索…',
    export_json: 'JSONをエクスポート',
    clear_faults: '保存コードを消去',
    clear_faults_confirm: 'クラウド上の故障コードをすべて削除しますか？',
    fault_search_empty: '検索に一致するコードはありません。',
    diagnostics_not_connected: '車両リンクが無効です',
    diagnostics_connect_hint:
      '車からライブの故障コードを読むには、ConnectタブでFuelFlow ESP32を接続してください。',

    // Reminders
    reminders_header: 'リマインダー',
    oil_remaining: 'オイル残量',
    oil_change_needed: '交換が必要',
    oil_type_label: 'オイル種類',
    last_oil_change: '前回交換',
    fuel_label: '燃料',
    fuel_low: '残量少',
    capacity_label: 'タンク容量',
    consumption_label: '消費量',
    nearest_station: '最寄りのGS',
    next_service: '次回メンテ',
    tips_header: 'ヒント',
    tip_1:
      '車両の推奨空気圧（ドアジャムの表示）に合わせてタイヤを充填してください。低圧は転がり抵抗と燃費を悪化させます。',
    tip_2:
      '長時間のアイドリングは避け、約1分以上停車する場合はエンジンを切るのが一般的な省燃費の指針です。',
    tip_3:
      'スムーズな加速と穏やかな制動は燃費に効きます。急激な運転は燃費を大きく下げることがあります。',
    tip_4:
      '不要な積載やルーフキャリアは外すと、重量と空気抵抗が減り燃費が改善します。',
    tip_5:
      'メーカー推奨のエンジンオイル粘度を使うと、効率と保護のバランスが良くなります。',
    tip_6:
      '用事をまとめて一つの外出にすると、コールドスタートと走行距離を抑えられます。',
    map_refresh: '地図を更新',

    // Settings
    account: 'アカウント',
    logout: 'ログアウト',
    preferences: '設定',
    language: '言語',
    metric_units: 'メートル法',
    notifications: '通知',
    fault_alerts: '故障アラート',
    maintenance_reminders: 'メンテナンスリマインダー',
    fault_notifications: '故障コードのプッシュ通知',
    service_notifications: 'サービス間隔の通知',

    // Navigation
    nav_dashboard: 'ダッシュボード',
    nav_connect: '接続',
    nav_diagnostics: '診断',
    nav_reminders: 'リマインダー',
    nav_settings: '設定',

    connect_search: 'デバイス検索',
    connect_search_ph: '名前またはIDで絞り込み',
    connect_scan: 'スキャン',
    connect_scan_btn: '近くをスキャン (12秒)',
    connect_quick: 'クイック接続',
    connect_devices: '見つかったデバイス',
    connect_scanning: 'スキャン中…',
    connect_no_devices: 'デバイスなし — スキャンを押す',
    connect_status: '接続状態',
    connect_connected: '接続済み',
    connect_disconnected: '未接続',
    connect_state_scanning: 'FuelFlowを検索中…',
    connect_state_connecting: '接続中…',
    connect_export_section: 'JSONエクスポート',
    connect_export_telemetry: 'ライブテレメトリ',
    connect_export_diagnostics: '診断スナップショット',
    connect_export_combined: 'テレメトリ＋診断',
    connect_export: 'エクスポート',
    connect_share_hint: '共有シートからファイルに保存できます。',
  },
};

export const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export interface LocalizationProviderProps {
  children: React.ReactNode;
}

export const LocalizationProvider: React.FC<LocalizationProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('mn');

  const t = (key: string): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  const value: LocalizationContextType = {
    language,
    t,
    setLanguage,
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
