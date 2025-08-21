// ---------------- Map Init ----------------
const map = L.map('map').setView([8.56235599179857, 76.858811986419], 15);

// Dark theme tiles (Carto dark basemap)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

// --- ResizeObserver to fix map sizing ---
const mapContainer = document.getElementById('map');
const resizeObserver = new ResizeObserver(() => {
  map.invalidateSize();
});
resizeObserver.observe(mapContainer);

const reflowMap = () => {
  requestAnimationFrame(() => {
    map.invalidateSize();
    setTimeout(() => map.invalidateSize(), 0);
  });
};
window.addEventListener('load', reflowMap);
window.addEventListener('resize', reflowMap);
map.whenReady(reflowMap);


// ---------------- Data ----------------
let poles = [
  {id:1, name:"Pole 1", coords:[8.561121456920256, 76.857288741109]},
  {id:2, name:"Pole 2", coords:[8.561406528979926, 76.85769082321161]},
  {id:3, name:"Pole 3", coords:[8.561952872142548, 76.85843646112221]},
  {id:4, name:"Pole 4", coords:[8.562446202520935, 76.8590480003807]},
  {id:5, name:"Pole 5", coords:[8.56333738027111, 76.8599009400019]},
];

let markers = {};
let lines = [];
let poleData = {}; // live data store keyed by pole_id

// init with default placeholder values
poles.forEach(p => {
  poleData[p.id] = {
    voltage: "---",
    current: "---",
    fault_code: "---",
    fault_type: "---",
    status: "OK",
    breaker_status: "---",
    timestamp: Date.now()
  };
});

const eventLogEl = document.getElementById('eventLog');
const poleInfoEl = document.getElementById('poleInfo');
const sidePanel = document.getElementById('sidePanel');
const hamburgerBtn = document.getElementById('hamburger-btn');


// ---------------- Functions ----------------
function addPoles() {
  for (let i=0; i<poles.length; i++) {
    let p = poles[i];
    let marker = L.circleMarker(p.coords, {
      radius: 9,
      color: "#4caf50",
      fillColor: "#4caf50",
      fillOpacity: 0.9
    }).addTo(map);
    marker.bindTooltip(p.name, {permanent:false});
    marker.on('click', () => {
      showPole(p);
      if (window.innerWidth <= 768) {
        sidePanel.classList.add('open');
      }
    });
    markers[p.id] = marker;

    // connect with previous pole
    if (i > 0) {
      let prev = poles[i-1];
      let line = L.polyline([prev.coords, p.coords], {color:"#4caf50", weight:4, opacity:0.8}).addTo(map);
      lines.push({ids:[prev.id,p.id], line});
    }
  }
}

function showPole(p) {
  const data = poleData[p.id] || {};
  poleInfoEl.innerHTML = `
    <h3 style="margin-bottom:5px; color:#4db6ff;">${p.name}</h3>
    <div><b>Status:</b> <span style="color:${statusColor(data.status)}">${data.status}</span></div>
    <div><b>Voltage:</b> ${data.voltage} V</div>
    <div><b>Current:</b> ${data.current} A</div>
    <div><b>Fault Code:</b> ${data.fault_code}</div>
    <div><b>Fault Type:</b> ${data.fault_type}</div>
    <div><b>Breaker:</b> ${data.breaker_status}</div>
    <div style="font-size:12px; color:#aaa;">Last update: ${new Date(data.timestamp).toLocaleTimeString()}</div>
  `;
}

function statusColor(status) {
  if (status === "FAULT") return "#f44336";   // red
  if (status === "WARNING") return "#ffc107"; // yellow
  return "#4caf50";                           // green
}

function updatePoleStatus(data) {
  const { pole_id, status } = data;
  if (!pole_id) return;

  // Store latest data
  poleData[pole_id] = data;

  // Update marker color
  if (markers[pole_id]) {
    markers[pole_id].setStyle({
      color: statusColor(status),
      fillColor: statusColor(status)
    });
  }

  // Update line color
  lines.forEach(l => {
    if (l.ids.includes(pole_id)) {
      l.line.setStyle({ color: statusColor(status) });
    }
  });

  // Log the event
  logEvent(
    `${status} @ Pole ${pole_id}: ${data.fault_type || "Normal"}`,
    status === "FAULT" ? "fault" : status === "WARNING" ? "warn" : "info"
  );
}

function logEvent(msg, type = 'info') {
  let color = '#e0e0e0';
  if (type === 'fault') color = '#f44336';
  if (type === 'warn') color = '#ffc107';
  
  eventLogEl.innerHTML += `<span style="color: ${color};">${new Date().toLocaleTimeString()}: ${msg}</span><br>`;
  eventLogEl.scrollTop = eventLogEl.scrollHeight;
}

function reset() {
  eventLogEl.innerHTML = "";
  poleInfoEl.innerHTML = "Click a pole to see details.";
  for (let id in markers) {
    markers[id].setStyle({color:"#4caf50", fillColor:"#4caf50"});
  }
  lines.forEach(l=> l.line.setStyle({color:"#4caf50"}));
  logEvent("System reset. All systems normal.");
}


// --- Hamburger Menu Logic ---
hamburgerBtn.addEventListener('click', () => {
  sidePanel.classList.toggle('open');
});

// Close menu if clicking outside of it on mobile
document.getElementById('mainContent').addEventListener('click', () => {
  if (window.innerWidth <= 768 && sidePanel.classList.contains('open')) {
    sidePanel.classList.remove('open');
  }
});


// ---------------- MQTT Setup ----------------
// requires: <script src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script> in your HTML

const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');

client.on('connect', () => {
  console.log("✅ Connected to HiveMQ Broker");
  client.subscribe("scada/grid/hashim/#"); // use your own namespace to avoid collisions
});

client.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    updatePoleStatus(data);
  } catch (err) {
    console.error("❌ Invalid MQTT message", err);
  }
});

client.on('error', (err) => {
  console.error("MQTT Error:", err);
});


// ---------------- Run ----------------
addPoles();
logEvent("System Initialized. Awaiting data...");
