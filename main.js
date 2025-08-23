// ---------------- Map Init ----------------
const map = L.map('map').setView([8.56235599179857, 76.858811986419], 17);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

// ---------------- Data ----------------
const COLOR = {
  OK: "#4caf50",
  WARNING: "#ffc107",
  NEUTRAL_DARK: "#b58900",
  FAULT: "#f44336",
  OFF: "#9e9e9e"
};

let poles = [
  {id:1, name:"Pole 1", coords:[8.561121456920256, 76.857288741109]},
  {id:2, name:"Pole 2", coords:[8.561406528979926, 76.85769082321161]},
  {id:3, name:"Pole 3", coords:[8.561952872142548, 76.85843646112221]},
  {id:4, name:"Pole 4", coords:[8.562446202520935, 76.8590480003807]},
  {id:5, name:"Substation", coords:[8.56333738027111, 76.8599009400019]}, // hardcoded substation
];

let markers = {};
let lines = [];
let poleData = {};
let selectedPoleId = null; // last-clicked pole id for simulateFault()

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
});

// ---------------- Helpers ----------------
function statusColor(status, faultType) {
  if (status === "FAULT") {
    if (faultType === "NeutralFault") return COLOR.NEUTRAL_DARK; // darker yellow for origin
    return COLOR.FAULT;
  }
  if (status === "WARNING") return COLOR.WARNING;
  if (status === "OFF") return COLOR.OFF;
  return COLOR.OK;
}

// sets marker + connected lines color
function setPoleColor(id, color) {
  const m = markers[id];
  if (!m) return;

  // Circle markers (poles 1-4) use setStyle
  if (m.setStyle) {
    m.setStyle({ color, fillColor: color });
  } else {
    // Substation (DivIcon with .triangle-marker)
    const el = m.getElement && m.getElement();
    if (el) {
      const tri = el.querySelector(".triangle-marker");
      if (tri) tri.style.borderBottomColor = color;
      // optional: tweak thunder color for contrast (white on red/gray)
      const thunder = el.querySelector(".thunder-icon");
      if (thunder) {
        thunder.style.filter = (color === COLOR.FAULT || color === COLOR.OFF) ? "invert(1)" : "none";
      }
    }
  }

  // Recolor all lines that include this id
  lines.forEach(l => {
    if (l.ids.includes(id)) l.line.setStyle({ color });
  });
}

function grayDownstream(fromId) {
  // downstream relative to substation(5) is decreasing ids
  for (let i = fromId - 1; i >= 1; i--) {
    setPoleColor(i, COLOR.OFF);
    poleData[i].status = "OFF";
  }
}

// ---------------- UI ----------------
const eventLogEl = document.getElementById('eventLog');
const poleInfoEl = document.getElementById('poleInfo');

function showAlert(msg) {
  // Query *when called* so it works even if banner element is after scripts
  const banner = document.getElementById("alertBanner");
  if (!banner) return;
  banner.innerText = msg;
  banner.style.display = "block";
  // force reflow
  void banner.offsetWidth;
  banner.classList.add("show");
  setTimeout(() => {
    banner.classList.remove("show");
    setTimeout(() => (banner.style.display = "none"), 500);
  }, 5000);
}

function logEvent(msg, type='info') {
  let color = "#e0e0e0";
  if (type === "fault") color = COLOR.FAULT;
  if (type === "warn") color = COLOR.WARNING;
  eventLogEl.innerHTML += `<span style="color:${color};">${new Date().toLocaleTimeString()} - ${msg}</span><br>`;
  eventLogEl.scrollTop = eventLogEl.scrollHeight;
}

function showPole(p) {
  selectedPoleId = p.id; // <-- track last clicked pole for simulateFault()
  const d = poleData[p.id];
  poleInfoEl.innerHTML = `
    <h3 style="margin-bottom:5px; color:#4db6ff;">${p.name}</h3>
    <div><b>Status:</b> <span style="color:${statusColor(d.status,d.fault_type)}">${d.status}</span></div>
    <div><b>Voltage:</b> ${d.voltage} V</div>
    <div><b>Current:</b> ${d.current} A</div>
    <div><b>Fault Code:</b> ${d.fault_code}</div>
    <div><b>Fault Type:</b> ${d.fault_type}</div>
    <div><b>Breaker:</b> ${d.breaker_status}</div>
  `;
}

// ---------------- Fault Logic ----------------
function updatePoleStatus(data) {
  const id = data.pole_id;
  if (!id) return;

  const status = data.status || "OK";
  const faultType = data.fault_type || "Normal";

  poleData[id] = { ...poleData[id], ...data };

  // CASE A: Substation fault (id=5)
  if (id === 5 && status === "FAULT") {
    setPoleColor(5, COLOR.FAULT); // substation red
    for (let i = 1; i < 5; i++) setPoleColor(i, COLOR.OFF); // all poles gray
    logEvent("Substation down! All poles off.", "fault");
    showAlert("⚡ Substation offline — all poles disconnected");
    return;
  }

  // CASE B: Neutral fault — origin dark yellow, downstream light yellow (warning)
  if (faultType === "NeutralFault" && status === "FAULT") {
    setPoleColor(id, COLOR.NEUTRAL_DARK); // origin darker yellow
    for (let i = id - 1; i >= 1; i--) setPoleColor(i, COLOR.WARNING); // downstream warning
    logEvent(`Neutral fault at Pole ${id}`, "warn");
    showAlert(`⚡ Neutral fault at Pole ${id}`);
    return;
  }

  // CASE C: Normal fault — origin red, downstream off (gray)
  if (status === "FAULT") {
    setPoleColor(id, COLOR.FAULT);
    grayDownstream(id);
    logEvent(`Fault at Pole ${id} - ${faultType}`, "fault");
    showAlert(`⚡ ${faultType} at Pole ${id}`);
    return;
  }

  // CASE D: Normal/warning update for a single pole
  setPoleColor(id, statusColor(status, faultType));
  // no banner for plain OK/WARNING updates
}

// ---------------- Map ----------------
function addPoles() {
  for (let i = 0; i < poles.length; i++) {
    const p = poles[i];
    let marker;

    if (p.id === 5) {
      // Substation: filled triangle + centered thunder SVG
      marker = L.marker(p.coords, {
        icon: L.divIcon({
          className: "substation-icon",
          html: `
            <div class="triangle-marker">
              <img src="thunder.svg" class="thunder-icon" alt="">
            </div>
          `,
          iconSize: [40, 40]
        })
      }).addTo(map);
    } else {
      // Poles: circle markers
      marker = L.circleMarker(p.coords, {
        radius: 9,
        color: COLOR.OK,
        fillColor: COLOR.OK,
        fillOpacity: 0.9
      }).addTo(map);
    }

    marker.bindTooltip(p.name);
    marker.on("click", () => showPole(p));
    markers[p.id] = marker;

    // Connect lines in order 5 -> 4 -> 3 -> 2 -> 1
    if (i > 0) {
      let prev = poles[i - 1];
      let line = L.polyline([prev.coords, p.coords], {
        color: COLOR.OK, weight: 4, opacity: 0.8
      }).addTo(map);
      lines.push({ ids: [prev.id, p.id], line });
    }
  }
}

// ---------------- MQTT ----------------
const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');
client.on('connect', () => {
  console.log("✅ Connected MQTT");
  client.subscribe("scada/grid/hashim/#");
});
client.on('message', (topic, msg) => {
  try {
    const data = JSON.parse(msg.toString());
    updatePoleStatus(data);
  } catch (err) {
    console.error("Invalid MQTT msg", err);
  }
});

// ---------------- Buttons ----------------
function simulateFault() {
  // Use last clicked pole, else default to 4
  const id = selectedPoleId || 4;
  const fake = { pole_id: id, status: "FAULT", fault_type: "Overcurrent", timestamp: Date.now() };
  updatePoleStatus(fake);
}
function reset() {
  // Back to normal (green) for all poles + lines
  poles.forEach(p => {
    poleData[p.id].status = "OK";
    poleData[p.id].fault_type = "Normal";
    setPoleColor(p.id, COLOR.OK);
  });
  logEvent("System reset to normal");
  showAlert("System reset to normal state");
}

// ---------------- Init ----------------
addPoles();
logEvent("System ready. Awaiting data...");
