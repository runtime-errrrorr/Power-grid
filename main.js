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

// Analytics data storage
let analyticsData = {
  timestamps: [],
  voltageData: {},
  currentData: {},
  maxDataPoints: 50
};

// init with default placeholder values
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
  
  // Initialize analytics data for each pole
  analyticsData.voltageData[p.id] = [];
  analyticsData.currentData[p.id] = [];
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
const sidePanel = document.getElementById('sidePanel');
const hamburgerBtn = document.getElementById('hamburger-btn');

// Analytics elements
let voltageChart, currentChart;
let analyticsVisible = true;


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
    <div><b>Breaker:</b> <span style="color:${data.breaker_status === "OPEN" ? "#f44336" : "#4caf50"};">${data.breaker_status}</span></div>
    <div style="font-size:12px; color:#aaa;">Last update: ${new Date(data.timestamp).toLocaleTimeString()}</div>
  `;
}

function statusColor(status) {
  if (status === "FAULT") return "#f44336";   // red
  if (status === "WARNING") return "#ffc107"; // yellow
  return "#4caf50";                           // green
}

function updatePoleStatus(data) {
  const pole_id = data.pole_id;
  const status = data.status || "OK"; // fallback

  if (!pole_id) {
    console.warn("Invalid data received, missing pole_id:", data);
    return;
  }

  // Store the latest data (merge with defaults)
  poleData[pole_id] = { ...poleData[pole_id], ...data };

  // Add data to analytics
  addAnalyticsData(pole_id, data.voltage, data.current);

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

  // Update global system indicator
  updateSystemStatus(status);

  // Log the event
  logEvent(
    `${status} @ Pole ${pole_id}: ${data.fault_type || "Normal"}`,
    status === "FAULT" ? "fault" : status === "WARNING" ? "warn" : "info",
    data
  );

  // Show banner if fault
  if (status === "FAULT") {
    showAlert(`⚡ ${data.fault_type} detected at Pole ${pole_id} — Breaker: ${data.breaker_status}`);
  }
}

function logEvent(msg, type = 'info', data = null) {
  let color = '#e0e0e0';
  if (type === 'fault') color = '#f44336';
  if (type === 'warn') color = '#ffc107';

  // table log (if present)
  const logTable = document.getElementById("eventLogTable");
  if (logTable && data) {
    let row = `<tr style="color:${color}">
      <td>${new Date(data.timestamp).toLocaleTimeString()}</td>
      <td>${data.fault_type || "-"}</td>
      <td>${data.pole_id ? "Pole " + data.pole_id : "-"}</td>
      <td>${msg}</td>
    </tr>`;
    logTable.innerHTML += row;
  } else {
    // fallback text log
    eventLogEl.innerHTML += `<span style="color: ${color};">${new Date().toLocaleTimeString()}: ${msg}</span><br>`;
    eventLogEl.scrollTop = eventLogEl.scrollHeight;
  }
}

function reset() {
  eventLogEl.innerHTML = "";
  poleInfoEl.innerHTML = "Click a pole to see details.";
  for (let id in poleData) {
    poleData[id] = {
      voltage: "---",
      current: "---",
      fault_code: "---",
      fault_type: "---",
      status: "OK",
      breaker_status: "---",
      timestamp: Date.now()
    };
  }
  for (let id in markers) {
    markers[id].setStyle({color:"#4caf50", fillColor:"#4caf50"});
  }
  lines.forEach(l=> l.line.setStyle({color:"#4caf50"}));
  updateSystemStatus("OK");
  logEvent("System reset. All systems normal.");
  
  // Clear analytics data
  clearAnalyticsData();
}

function clearAnalyticsData() {
  analyticsData.timestamps = [];
  Object.keys(analyticsData.voltageData).forEach(id => {
    analyticsData.voltageData[id] = [];
  });
  Object.keys(analyticsData.currentData).forEach(id => {
    analyticsData.currentData[id] = [];
  });
  updateCharts();
}

function updateSystemStatus(status) {
  const light = document.getElementById("status-light");
  const text = document.getElementById("status-text");
  if (!light || !text) return;

  text.innerText = status;
  if (status === "FAULT") {
    light.style.background = "#f44336"; 
    text.style.color = "#f44336";
  } else if (status === "WARNING") {
    light.style.background = "#ffc107"; 
    text.style.color = "#ffc107";
  } else {
    light.style.background = "#4caf50"; 
    text.style.color = "#4caf50";
  }
}

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

// ---------------- Analytics Functions ----------------
function initializeAnalytics() {
  console.log("Initializing analytics...");
  
  // Populate pole selector
  const poleSelect = document.getElementById('selectedPole');
  poles.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.name;
    poleSelect.appendChild(option);
  });

  // Initialize charts
  initializeCharts();
  
  // Setup resize functionality
  setupResizeHandler();
  
  console.log("Analytics initialized successfully");
}

function initializeCharts() {
  console.log("Initializing charts...");
  
  const voltageCtx = document.getElementById('voltageChart');
  const currentCtx = document.getElementById('currentChart');
  
  if (!voltageCtx || !currentCtx) {
    console.error("Chart canvases not found!");
    return;
  }
  
  const voltageCtx2d = voltageCtx.getContext('2d');
  const currentCtx2d = currentCtx.getContext('2d');

  const chartConfig = {
    type: 'line',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 300
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'second',
            displayFormats: {
              second: 'HH:mm:ss'
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#9aa4b2',
            maxTicksLimit: 8
          }
        },
        y: {
          beginAtZero: false,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#9aa4b2'
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: '#e6e7ea'
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  };

  voltageChart = new Chart(voltageCtx2d, {
    ...chartConfig,
    data: {
      labels: [],
      datasets: poles.map(p => ({
        label: p.name,
        data: [],
        borderColor: getPoleColor(p.id),
        backgroundColor: getPoleColor(p.id, 0.1),
        tension: 0.4,
        pointRadius: 3,
        borderWidth: 2
      }))
    },
    options: {
      ...chartConfig.options,
      plugins: {
        ...chartConfig.options.plugins,
        title: {
          display: true,
          text: 'Voltage (V)',
          color: '#6bc1ff',
          font: { size: 14 }
        }
      }
    }
  });

  currentChart = new Chart(currentCtx2d, {
    ...chartConfig,
    data: {
      labels: [],
      datasets: poles.map(p => ({
        label: p.name,
        data: [],
        borderColor: getPoleColor(p.id),
        backgroundColor: getPoleColor(p.id, 0.1),
        tension: 0.4,
        pointRadius: 3,
        borderWidth: 2
      }))
    },
    options: {
      ...chartConfig.options,
      plugins: {
        ...chartConfig.options.plugins,
        title: {
          display: true,
          text: 'Current (A)',
          color: '#6bc1ff',
          font: { size: 14 }
        }
      }
    }
  });
  
  console.log("Charts created successfully:", { voltageChart, currentChart });
}

function getPoleColor(poleId, alpha = 1) {
  const colors = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336'];
  const color = colors[(poleId - 1) % colors.length];
  if (alpha === 1) return color;
  return color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
}

function addAnalyticsData(poleId, voltage, current) {
  const timestamp = new Date();
  
  // Add voltage data
  if (voltage !== "---" && !isNaN(voltage)) {
    analyticsData.voltageData[poleId].push({
      x: timestamp,
      y: voltage
    });
    console.log(`Added voltage data for pole ${poleId}:`, voltage);
  }
  
  // Add current data
  if (current !== "---" && !isNaN(current)) {
    analyticsData.currentData[poleId].push({
      x: timestamp,
      y: current
    });
    console.log(`Added current data for pole ${poleId}:`, current);
  }
  
  // Limit data points for each pole
  if (analyticsData.voltageData[poleId].length > analyticsData.maxDataPoints) {
    analyticsData.voltageData[poleId].shift();
  }
  if (analyticsData.currentData[poleId].length > analyticsData.maxDataPoints) {
    analyticsData.currentData[poleId].shift();
  }
  
  updateCharts();
}

function updateCharts() {
  if (!voltageChart || !currentChart) {
    console.log("Charts not ready yet:", { voltageChart, currentChart });
    return;
  }
  
  const selectedPole = document.getElementById('selectedPole').value;
  console.log("Updating charts for pole:", selectedPole);
  
  // Update voltage chart
  voltageChart.data.datasets.forEach((dataset, index) => {
    const poleId = poles[index].id;
    if (selectedPole === 'all' || selectedPole == poleId) {
      dataset.data = analyticsData.voltageData[poleId] || [];
      dataset.hidden = false;
      console.log(`Voltage data for ${poles[index].name}:`, dataset.data);
    } else {
      dataset.hidden = true;
    }
  });
  voltageChart.update('none');
  
  // Update current chart
  currentChart.data.datasets.forEach((dataset, index) => {
    const poleId = poles[index].id;
    if (selectedPole === 'all' || selectedPole == poleId) {
      dataset.data = analyticsData.currentData[poleId] || [];
      dataset.hidden = false;
      console.log(`Current data for ${poles[index].name}:`, dataset.data);
    } else {
      dataset.hidden = true;
    }
  });
  currentChart.update('none');
  
  console.log("Charts updated successfully");
}

function updateAnalytics() {
  updateCharts();
}

function toggleAnalytics() {
  const analyticsBlock = document.getElementById('analyticsBlock');
  const toggleBtn = document.getElementById('toggleAnalytics');
  
  if (analyticsVisible) {
    analyticsBlock.style.height = '0px';
    analyticsBlock.style.minHeight = '0px';
    toggleBtn.textContent = '📈';
    analyticsVisible = false;
  } else {
    analyticsBlock.style.height = '300px';
    analyticsBlock.style.minHeight = '300px';
    toggleBtn.textContent = '📉';
    analyticsVisible = true;
  }
}

function setupResizeHandler() {
  const analyticsBlock = document.getElementById('analyticsBlock');
  const resizeHandle = analyticsBlock.querySelector('.resize-handle');
  
  let isResizing = false;
  let startY = 0;
  let startHeight = 0;
  
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startY = e.clientY;
    startHeight = parseInt(getComputedStyle(analyticsBlock).height, 10);
    document.body.style.cursor = 'ns-resize';
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const deltaY = startY - e.clientY;
    const newHeight = Math.max(200, Math.min(600, startHeight + deltaY));
    analyticsBlock.style.height = newHeight + 'px';
  });
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
    }
  });
}

function simulateFault(type = "Overcurrent") {
  let randPole = poles[Math.floor(Math.random()*poles.length)];
  let fake = {
    pole_id: randPole.id,
    substation_id: "S01",
    voltage: type === "Overcurrent" ? 260 : 180,
    current: type === "Overcurrent" ? 150 : 80,
    fault_code: type === "Overcurrent" ? 51 : 27,
    fault_type: type,
    status: "FAULT",
    breaker_status: "OPEN",
    timestamp: Date.now()
  };
  updatePoleStatus(fake);
}

// Generate sample data for demonstration
function generateSampleData() {
  poles.forEach(pole => {
    const baseVoltage = 220 + (Math.random() - 0.5) * 20; // 210-230V range
    const baseCurrent = 80 + (Math.random() - 0.5) * 20;  // 70-90A range
    
    const sampleData = {
      pole_id: pole.id,
      voltage: Math.round(baseVoltage),
      current: Math.round(baseCurrent),
      status: "OK",
      timestamp: Date.now()
    };
    
    updatePoleStatus(sampleData);
  });
}

// Generate sample data every 5 seconds for demonstration
setInterval(generateSampleData, 5000);

// Generate initial sample data immediately
setTimeout(generateSampleData, 1000);


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

// ---------------- Init ----------------
addPoles();
logEvent("System Initialized. Awaiting data...");

// Initialize analytics after everything is loaded
window.addEventListener('load', () => {
  console.log("Window loaded, initializing analytics...");
  setTimeout(() => {
    initializeAnalytics();
  }, 100);
});
