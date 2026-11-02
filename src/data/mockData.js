// Real Hardware Configuration for Smart Greenhouse
// Moslashtirilgan: 1 ta DHT22 (Harorat + Havo namligi), 10 ta Tuproq namligi datchigi, 4 ta Rele

export const INITIAL_SENSORS = [
  {
    id: 'temp1',
    name: 'Harorat (DHT22)',
    zone: 'Asosiy Zona',
    type: 'temperature',
    value: 0,
    unit: '°C',
    min: 0,
    max: 50,
    optimal: { min: 20, max: 28 },
    esp32: 'GPIO 13',
    status: 'normal',
    lastUpdate: null,
  },
  {
    id: 'humid1',
    name: 'Havo Namligi (DHT22)',
    zone: 'Asosiy Zona',
    type: 'humidity',
    value: 0,
    unit: '%',
    min: 0,
    max: 100,
    optimal: { min: 55, max: 75 },
    esp32: 'GPIO 13',
    status: 'normal',
    lastUpdate: null,
  },
];

export const INITIAL_SOIL_SENSORS = Array.from({ length: 10 }, (_, i) => ({
  id: `soil${i + 1}`,
  name: `Ko'chat ${i + 1}`,
  zone: `Qator ${Math.floor(i / 5) + 1}`,
  value: 0,
  unit: '%',
  wet: false,
  status: 'offline',
  pin: i + 1,
  plant: `Ko'chat #${i + 1}`,
}));

export const INITIAL_DEVICES = [
  {
    id: 'heater',
    name: 'Isitish Plitasi',
    nameEn: 'Heating Plate',
    icon: 'fire',
    isOn: false,
    mode: 'manual',
    power: 2000,
    zone: 'Issiqxona',
    esp32: 'Rele 1 (D18)',
    relayChannel: 1,
    color: 'orange',
  },
  {
    id: 'fan1',
    name: 'Shamollatish 1',
    nameEn: 'Ventilation Fan 1',
    icon: 'fan',
    isOn: false,
    mode: 'manual',
    power: 120,
    zone: 'Issiqxona',
    esp32: 'Rele 2 (D19)',
    relayChannel: 2,
    color: 'blue',
  },
  {
    id: 'fan2',
    name: 'Shamollatish 2',
    nameEn: 'Ventilation Fan 2',
    icon: 'fan',
    isOn: false,
    mode: 'manual',
    power: 120,
    zone: 'Issiqxona',
    esp32: 'Rele 3 (D22)',
    relayChannel: 3,
    color: 'blue',
  },
  {
    id: 'pump',
    name: "Sug'orish Nasosi",
    nameEn: 'Irrigation Pump',
    icon: 'water',
    isOn: false,
    mode: 'manual',
    power: 350,
    zone: 'Issiqxona',
    esp32: 'Rele 4 (D23)',
    relayChannel: 4,
    color: 'green',
  },
];

export const PLANTS = Array.from({ length: 10 }, (_, i) => ({
  id: `plant${i + 1}`,
  name: `Ko'chat #${i + 1}`,
  zone: `Qator ${Math.floor(i / 5) + 1}`,
  type: "Ko'chat",
  health: 'yaxshi',
  plantedDate: '2026-10-01',
  soilMoisture: 0,
  row: i + 1,
}));

export const ESP32_MODULES = [
  {
    id: 'esp1',
    name: 'ESP32 / ESP8266 Nazoratchi',
    ip: 'Offline',
    status: 'offline',
    rssi: 0,
    uptime: '—',
    firmware: 'v2.4.1',
    sensors: ['temp1', 'humid1'],
    devices: ['heater', 'fan1', 'fan2', 'pump'],
  },
];

export const CHART_DATA = [];

export const ALERTS = [];

export const AUTOMATION_RULES = [
  {
    id: 'rule1',
    name: 'Harorat Avtomatik Boshqaruv',
    condition: 'Harorat > 28°C',
    action: 'Shamollatishni yoqish',
    isActive: false,
    triggeredCount: 0,
    lastTriggered: 'Faol emas',
  },
  {
    id: 'rule2',
    name: 'Tuproq Namligi Avtomatik',
    condition: 'Tuproq namligi < 40%',
    action: "Sug'orish nasosini yoqish",
    isActive: false,
    triggeredCount: 0,
    lastTriggered: 'Faol emas',
  },
  {
    id: 'rule3',
    name: 'Kechki Isitish',
    condition: "Harorat < 18°C",
    action: 'Isitish plitasini yoqish',
    isActive: false,
    triggeredCount: 0,
    lastTriggered: 'Faol emas',
  },
];
