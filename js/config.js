// ================= CONFIG =================
const COLOR = {
    OK: "#4caf50",
    WARNING: "#ffc107",
    NEUTRAL_DARK: "#b58900",
    FAULT: "#f44336",
    OFF: "#9e9e9e",
    OVERVOLT: "#00bfff",   // bright cyan (fast)
    UNDERVOLT: "#1e90ff"   // dimmer blue (slow)
  };
  
  const SUBSTATION_ID = 5;
  
  const poles = [
    { id: 1, name: "Pole 1", coords: [8.561121456920256, 76.857288741109] },
    { id: 2, name: "Pole 2", coords: [8.561406528979926, 76.85769082321161] },
    { id: 3, name: "Pole 3", coords: [8.561952872142548, 76.85843646112221] },
    { id: 4, name: "Pole 4", coords: [8.562446202520935, 76.8590480003807] },
    { id: SUBSTATION_ID, name: "Substation", coords: [8.56333738027111, 76.8599009400019] }
  ];
  
  // Shared states
  let markers = {};          // poleId -> Leaflet marker
  let lines = [];            // [{ids:[a,b], line:L.Polyline}]
  let poleData = {};         // telemetry per pole
  let faultIcons = {};       // poleId -> overlay icon marker
  let selectedPoleId = null; // last clicked pole
  
  // Analytics data storage
  let analyticsData = {
    timestamps: [],
    voltageData: {},
    currentData: {},
    maxDataPoints: 50
  };
  
  // init defaults
  poles.forEach(p => {
    poleData[p.id] = {
      voltage: "---",
      current: "---",
      fault_code: "---",
      fault_type: "Normal",
      status: "OK",
      breaker_status: "---",
      timestamp: Date.now()
    };
    analyticsData.voltageData[p.id] = [];
    analyticsData.currentData[p.id] = [];
  });
  