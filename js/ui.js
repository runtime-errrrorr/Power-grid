// ================= UI & Alerts =================
const eventLogEl = document.getElementById('eventLog');
const poleInfoEl = document.getElementById('poleInfo');
const sidePanel = document.getElementById('sidePanel');
const hamburgerBtn = document.getElementById('hamburger-btn');
if (hamburgerBtn && sidePanel) {
  hamburgerBtn.addEventListener('click', () => sidePanel.classList.toggle('open'));
}

function showAlert(msg) {
  const banner = document.getElementById("alertBanner");
  if (!banner) return;
  banner.innerText = msg;
  banner.style.display = "block";
  void banner.offsetWidth;
  banner.classList.add("show");
  setTimeout(() => {
    banner.classList.remove("show");
    setTimeout(() => (banner.style.display = "none"), 500);
  }, 5000);
}

function logEvent(msg, type = 'info', data = null) {
  let color = '#e0e0e0';
  if (type === 'fault') color = COLOR.FAULT;
  if (type === 'warn') color = COLOR.WARNING;
  if (eventLogEl) {
    eventLogEl.innerHTML += `<span style="color:${color};">${new Date().toLocaleTimeString()} - ${msg}</span><br>`;
    eventLogEl.scrollTop = eventLogEl.scrollHeight;
  }
}

function updateSystemStatus(status) {
  const light = document.getElementById("status-light");
  const text = document.getElementById("status-text");
  if (!light || !text) return;
  text.innerText = status;
  if (status === "FAULT") { light.style.background = COLOR.FAULT; text.style.color = COLOR.FAULT; }
  else if (status === "WARNING") { light.style.background = COLOR.WARNING; text.style.color = COLOR.WARNING; }
  else { light.style.background = COLOR.OK; text.style.color = COLOR.OK; }
}

function showPole(p) {
  selectedPoleId = p.id;
  const d = poleData[p.id];
  poleInfoEl.innerHTML = `
    <h3 style="margin-bottom:5px; color:#4db6ff;">${p.name}</h3>
    <div><b>Status:</b> ${d.status}</div>
    <div><b>Voltage:</b> ${d.voltage} V</div>
    <div><b>Current:</b> ${d.current} A</div>
    <div><b>Fault Code:</b> ${d.fault_code}</div>
    <div><b>Fault Type:</b> ${d.fault_type}</div>
    <div><b>Breaker:</b> ${d.breaker_status}</div>
    <div style="font-size:12px; color:#aaa;">Last update: ${new Date(d.timestamp).toLocaleTimeString()}</div>
  `;
}
