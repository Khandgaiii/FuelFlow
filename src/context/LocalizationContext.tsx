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
    no_connection: 'Vehicle not connected — try simulation',
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
    tip_tire: 'Regularly check tire pressure to save fuel.',
    tip_cargo: 'Avoid carrying unnecessary cargo.',
    tip_driving: 'Smooth acceleration and braking is most efficient.',

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
    nav_diagnostics: 'Diagnostics',
    nav_reminders: 'Reminders',
    nav_settings: 'Settings',
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
    no_connection: 'Машин холбогдоогүй — Симуляц ашиглаж туршина уу',
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
    tip_tire: 'Дугуйн даралтыг тогтмол шалгаж байх нь шатахуун хэмнэнэ.',
    tip_cargo: 'Тэргэндээ шаардлагагүй ачаа авч явахаас зайлсхий.',
    tip_driving: 'Жигд хурдасч, жигд тормозлох нь хамгийн үр ашигтай.',

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
    nav_diagnostics: 'Оношлогоо',
    nav_reminders: 'Сануулга',
    nav_settings: 'Тохиргоо',
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
    no_connection: '車両未接続 — シミュレーションをお試しください',
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
    tip_tire: 'タイヤ空気圧を定期的にチェックして燃費を節約。',
    tip_cargo: '不要な荷物は降ろしましょう。',
    tip_driving: 'スムーズな加速とブレーキが最も効率的です。',

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
    nav_diagnostics: '診断',
    nav_reminders: 'リマインダー',
    nav_settings: '設定',
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
