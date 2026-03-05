import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'es' | 'mn';

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
    // Login Screen
    login_title: 'FuelFlow',
    login_username: 'Username',
    login_password: 'Password',
    login_button: 'Log In',

    // Dashboard
    dashboard_title: 'Sonata 6 Dashboard',
    dashboard_status: 'Connected',
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
    realtime_performance: 'Real-Time Performance',

    // Diagnostics
    diagnostics_title: 'Vehicle Diagnostics',
    critical: 'Critical',
    warnings: 'Warnings',
    total: 'Total',
    detected: 'Detected',
    fault_code: 'Fault Code',
    description: 'Description',
    tags: 'Tags',
    active_fault_codes: 'Active Fault Codes',
    all_systems_normal: 'All Systems Normal',
    no_active_faults: 'No active fault codes detected',
    status: 'Status',
    P0300: 'Random/Multiple Cylinder Misfire Detected',
    P0171: 'System Too Lean (Bank 1)',
    P0128: 'Coolant Thermostat (Coolant Temp Regulating Thermo)',
    P0405: 'EGR Sensor A Range/Performance',
    P0420: 'Catalyst System Efficiency Below Threshold',
    P0507: 'Idle Air Control System Malfunction',
    tag_critical: 'CRITICAL',
    tag_engine: 'ENGINE',
    tag_fuel: 'FUEL',
    tag_cooling: 'COOLING',
    tag_emissions: 'EMISSIONS',
    tag_info: 'INFO',
    tag_warning: 'WARNING',

    // Reminders
    reminders_title: 'Service Reminders',
    oil_life_remaining: 'Oil Life Remaining',
    service_soon: 'Service Soon',
    oil_type: 'Oil Type',
    last_service: 'Last Service',
    refuel_reminder: 'Refuel Reminder',
    low_fuel: '🚨 Low Fuel',
    tank_capacity: 'Tank Capacity',
    avg_consumption: 'Avg. Consumption',
    nearest_station: 'Nearest Station',
    next_scheduled_service: 'Next Scheduled Service',
    tips_fuel_efficiency: 'Tips for Better Fuel Efficiency',
    tip_tire_pressure: 'Maintain proper tire pressure',
    tip_cargo: 'Remove unnecessary cargo',
    tip_acceleration: 'Avoid aggressive acceleration',

    // Settings
    settings_title: 'Settings',
    preferences: 'Preferences',
    language: 'Language',
    metric_units: 'Metric Units',
    notifications: 'Notifications',
    fault_alerts: 'Fault Alerts',
    maintenance_reminders: 'Maintenance Reminders',
    connection: 'Connection',
    obd_protocol: 'OBD-II Protocol',
    device: 'Device',
    signal_strength: 'Signal Strength',
    about: 'About',
    app_version: 'App Version',
    fault_notifications: 'Push notifications for fault codes',
    service_notifications: 'Service interval notifications',
    can_protocol: 'CAN 500Kbps',
    elm_device: '📡 ELM327 v2.1',
    signal_excellent: 'Excellent',

    // Navigation
    nav_dashboard: 'Dashboard',
    nav_diagnostics: 'Diagnostics',
    nav_reminders: 'Reminders',
    nav_settings: 'Settings',
  },
  mn: {
    // Login Screen
    login_title: 'FuelFlow',
    login_username: 'Хэрэглэгчийн нэр',
    login_password: 'Нууц үг',
    login_button: 'Нэвтрэх',

    // Dashboard
    dashboard_title: 'Ажиглалтын самбар',
    dashboard_status: 'Холбогдсон',
    speed: 'Хурд',
    speed_unit: 'KM/H',
    rpm: 'RPM',
    fuel_consumption: 'Түлшний зарцуулалт',
    fuel_consumption_unit: 'L/100km',
    throttle_position: 'Хаазны байрлал',
    throttle_unit: '%',
    battery: 'Батарей',
    battery_unit: 'V',
    coolant: 'Хөргөлтийн шингэн',
    coolant_unit: '°C',
    oil_pressure: 'Тосны даралт',
    oil_pressure_unit: 'PSI',
    engine_load: 'Моторын ачаалал',
    engine_load_unit: '%',
    realtime_performance: 'Бодит цагийн мэдээлэл',

    // Diagnostics
    diagnostics_title: 'Машины оношлогоо',
    critical: 'Нэн даруй засвар шаардлагатай',
    warnings: 'Сануулга',
    total: 'Нийт',
    detected: 'Илэрсэн',
    fault_code: 'Алдааны код',
    description: 'Тайлбар',
    tags: 'Тагууд',
    active_fault_codes: 'Идэвхтэй алдааны кодууд',
    all_systems_normal: 'Бүх системүүд хэвийн',
    no_active_faults: 'Идэвхтэй алдааны код илэрээгүй',
    status: 'Статус',
    P0300: 'Цилиндерийн олон тооны шаталт илэрсэн',
    P0171: 'Лагаанз хахахаххаха(Банк 1)',
    P0128: 'Хөргөлтийн термостатад асуудал гарсан байна (Хөргөлтийн температурыг зохицуулах термостат)',
    P0405: 'EGR сенсорт мэдээлэл ирэхгүй байна',
    P0420: 'Катализаторын системийн үр ашиг хэт доогуур байна',
    P0507: 'Агааржуулагчийн системийн доголдол',
    tag_critical: 'НЭН ДАРУЙ',
    tag_engine: 'МОТОР',
    tag_fuel: 'ТҮЛШ',
    tag_cooling: 'ХӨРГӨЛТ',
    tag_emissions: 'БҮХ ТӨРЛИЙН УХААЛГЫН ЦАХИЛГААН',
    tag_info: 'МЭДЭЭЛЭЛ',
    tag_warning: 'САНУУЛГА',

    // Reminders
    reminders_title: 'Засварын сануулга',
    oil_life_remaining: 'Тосны үлдсэн ашиглалтын хугацаа',
    service_soon: 'Солих шаардлагатай',
    oil_type: 'Тосны төрөл',
    last_service: 'Сүүлд хийсэн засвар',
    refuel_reminder: 'Түлш нөхөх сануулга',
    low_fuel: '🚨 Бага түлш',
    tank_capacity: 'Танкны багтаамж',
    avg_consumption: 'Дундаж хэрэглээ',
    nearest_station: 'Хамгийн ойр бензин станц',
    next_scheduled_service: 'Дараагийн төлөвлөгөөт засвар',
    tips_fuel_efficiency: 'Түлшний үр ашигтай байдалаа сайжруулах зөвлөмжүүд',
    tip_tire_pressure: 'Дугуйн даралыг зөв хадгалах',
    tip_cargo: 'Шаардлагагүй ачааг бууруулах',
    tip_acceleration: 'Огцом хурдлахгүй байх',

    // Settings
    settings_title: 'Тохиргоо',
    preferences: 'Сонголт',
    language: 'Хэл',
    metric_units: 'Метрик хэмжих нэгж',
    notifications: 'Мэдээллүүд',
    fault_alerts: 'Алдааны сануулга',
    maintenance_reminders: 'Засварын сануулга',
    connection: 'Холболт',
    obd_protocol: 'OBD-II протокол',
    device: 'Төхөөрөмж',
    signal_strength: 'Дохионы хүч',
    about: 'Тухай',
    app_version: 'Аппликейшны хувилбар',
    fault_notifications: 'Алдааны кодын түргэн мэдэгдэл',
    service_notifications: 'Үйлчилгээний үе завсар мэдэгдэл',
    can_protocol: 'CAN 500Kbps',
    elm_device: '📡 ELM327 v2.1',
    signal_excellent: 'Сайн',

    // Navigation
    nav_dashboard: 'Ажиглалтын самбар',
    nav_diagnostics: 'Оношлогоо',
    nav_reminders: 'Сануулга',
    nav_settings: 'Тохиргоо',
  },
  es: {
    // Login Screen
    login_title: 'FuelFlow',
    login_username: 'Nombre de usuario',
    login_password: 'Contraseña',
    login_button: 'Iniciar sesión',

    // Dashboard
    dashboard_title: 'Panel de control Sonata 6',
    dashboard_status: 'Conectado',
    speed: 'Velocidad',
    speed_unit: 'KM/H',
    rpm: 'RPM',
    fuel_consumption: 'Consumo de combustible',
    fuel_consumption_unit: 'L/100km',
    throttle_position: 'Posición del acelerador',
    throttle_unit: '%',
    battery: 'Batería',
    battery_unit: 'V',
    coolant: 'Refrigerante',
    coolant_unit: '°C',
    oil_pressure: 'Presión del aceite',
    oil_pressure_unit: 'PSI',
    engine_load: 'Carga del motor',
    engine_load_unit: '%',
    realtime_performance: 'Rendimiento en tiempo real',

    // Diagnostics
    diagnostics_title: 'Diagnóstico del vehículo',
    critical: 'Crítico',
    warnings: 'Advertencias',
    total: 'Total',
    detected: 'Detectado',
    fault_code: 'Código de falla',
    description: 'Descripción',
    tags: 'Etiquetas',
    active_fault_codes: 'Códigos de falla activos',
    all_systems_normal: 'Todos los sistemas normales',
    no_active_faults: 'No se detectaron códigos de falla activos',
    status: 'Estado',
    P0300: 'Encendido múltiple aleatorio/múltiple detectado',
    P0171: 'Sistema demasiado pobre (Banco 1)',
    P0128: 'Termostato refrigerante (Termostato de regulación de temperatura de refrigerante)',
    P0405: 'Rango/rendimiento del sensor EGR A',
    P0420: 'Eficiencia del sistema de catalizador por debajo del umbral',
    P0507: 'Mal funcionamiento del sistema de control de aire inactivo',
    tag_critical: 'CRÍTICO',
    tag_engine: 'MOTOR',
    tag_fuel: 'COMBUSTIBLE',
    tag_cooling: 'REFRIGERACIÓN',
    tag_emissions: 'EMISIONES',
    tag_info: 'INFORMACIÓN',
    tag_warning: 'ADVERTENCIA',

    // Reminders
    reminders_title: 'Recordatorios de servicio',
    oil_life_remaining: 'Vida útil del aceite restante',
    service_soon: 'Servicio pronto',
    oil_type: 'Tipo de aceite',
    last_service: 'Último servicio',
    refuel_reminder: 'Recordatorio de reabastecimiento',
    low_fuel: '🚨 Combustible bajo',
    tank_capacity: 'Capacidad del tanque',
    avg_consumption: 'Consumo promedio',
    nearest_station: 'Estación más cercana',
    next_scheduled_service: 'Próximo servicio programado',
    tips_fuel_efficiency: 'Consejos para mejorar la eficiencia de combustible',
    tip_tire_pressure: 'Mantener la presión correcta de los neumáticos',
    tip_cargo: 'Eliminar carga innecesaria',
    tip_acceleration: 'Evitar aceleración agresiva',

    // Settings
    settings_title: 'Configuración',
    preferences: 'Preferencias',
    language: 'Idioma',
    metric_units: 'Unidades métricas',
    notifications: 'Notificaciones',
    fault_alerts: 'Alertas de falla',
    maintenance_reminders: 'Recordatorios de mantenimiento',
    connection: 'Conexión',
    obd_protocol: 'Protocolo OBD-II',
    device: 'Dispositivo',
    signal_strength: 'Fuerza de señal',
    about: 'Acerca de',
    app_version: 'Versión de la aplicación',
    fault_notifications: 'Notificaciones push para códigos de falla',
    service_notifications: 'Notificaciones de intervalo de servicio',
    can_protocol: 'CAN 500Kbps',
    elm_device: '📡 ELM327 v2.1',
    signal_excellent: 'Excelente',

    // Navigation
    nav_dashboard: 'Panel de control',
    nav_diagnostics: 'Diagnóstico',
    nav_reminders: 'Recordatorios',
    nav_settings: 'Configuración',
  },
};

export const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export interface LocalizationProviderProps {
  children: React.ReactNode;
}

export const LocalizationProvider: React.FC<LocalizationProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key] || key;
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
