// ========================== Configuration ==========================

// Map Configuration
export const MAP_CONFIG = {
  CENTER: [8.56235599179857, 76.858811986419],
  ZOOM: 17,
  TILE_URL: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  ATTRIBUTION: '&copy; OpenStreetMap contributors &copy; CARTO',
  SUBDOMAINS: 'abcd',
  MAX_ZOOM: 19
};

// Color Scheme
export const COLOR = {
  OK: "#4caf50",
  WARNING: "#ffc107",
  NEUTRAL_DARK: "#b58900",
  FAULT: "#f44336",
  OFF: "#9e9e9e",
  OVERVOLT: "#00bfff",   // bright cyan (fast)
  UNDERVOLT: "#1e90ff"   // dimmer blue (slow)
};

// System Configuration
export const SUBSTATION_ID = 5;
export const ANALYTICS_MAX_DATA_POINTS = 50;

// Pole Data
export const POLES = [
  { id: 1, name: "Pole 1", coords: [8.561121456920256, 76.857288741109] },
  { id: 2, name: "Pole 2", coords: [8.561406528979926, 76.85769082321161] },
  { id: 3, name: "Pole 3", coords: [8.561952872142548, 76.85843646112221] },
  { id: 4, name: "Pole 4", coords: [8.562446202520935, 76.8590480003807] },
  { id: SUBSTATION_ID, name: "Substation", coords: [8.56333738027111, 76.8599009400019] }
];

// MQTT Configuration
export const MQTT_CONFIG = {
  BROKER_URL: "wss://broker.hivemq.com:8884/mqtt",
  TOPICS: {
    SUBSTATION: "scada/grid/substation1/status",
    POLES: "scada/grid/pole/1",
    COMMANDS: "scada/grid/substation1/recharge"
  }
};

// Chart Configuration
export const CHART_CONFIG = {
  ANIMATION_DURATION: 300,
  MAX_TICKS: 8,
  LINE_TENSION: 0.3,
  POINT_RADIUS: 0
};
