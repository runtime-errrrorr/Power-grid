// ================= Main =================
const map = L.map('map').setView([8.56235599179857, 76.858811986419], 17);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

addPoles(map);
initializeAnalytics();
reset();

// Simulate & Reset
function simulateFault() {
  const id = selectedPoleId || 4;
  const fake = {
    pole_id: id,
    status: "FAULT",
    fault_type: "Overvoltage", // test
    voltage: 270,
    current: 110,
    breaker_status: "OPEN",
    timestamp: Date.now()
  };
  updatePoleStatus(fake);
}

function generateSampleData() {
  poles.forEach(p => {
    const sample = {
      pole_id: p.id,
      status: "OK",
      fault_type: "Normal",
      voltage: (220 + Math.random() * 20).toFixed(1),
      current: (50 + Math.random() * 20).toFixed(1),
      breaker_status: "CLOSED",
      timestamp: Date.now()
    };
    updatePoleStatus(sample);
  });
}

function reset() {
  resetAllVisuals();
  poles.forEach(p => {
    poleData[p.id] = {
      voltage: "---", current: "---", fault_code: "---",
      fault_type: "Normal", status: "OK", breaker_status: "---",
      timestamp: Date.now()
    };
    clearPoleFaultIcon(p.id);
  });
  updateSystemStatus("OK");
  eventLogEl.innerHTML = "";
  logEvent("System Reset");
}
