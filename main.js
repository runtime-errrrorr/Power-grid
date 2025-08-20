// ---------------- Map Init ----------------
const map = L.map('map').setView([12.9716, 77.5946], 15);

// Dark theme tiles (Carto dark basemap)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

// --- Use ResizeObserver for a robust way to handle map resizing ---
// This ensures the map correctly fills its container after the layout is calculated.
const mapContainer = document.getElementById('map');
const resizeObserver = new ResizeObserver(() => {
    map.invalidateSize();
});
resizeObserver.observe(mapContainer);

// Ensure proper sizing on load and window resizes
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
  {id:1, name:"Pole 1", coords:[12.972, 77.594]},
  {id:2, name:"Pole 2", coords:[12.9722, 77.595]},
  {id:3, name:"Pole 3", coords:[12.9725, 77.596]},
  {id:4, name:"Pole 4", coords:[12.9727, 77.597]},
  {id:5, name:"Pole 5", coords:[12.9730, 77.598]},
];
let markers = {};
let lines = [];
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
  poleInfoEl.innerHTML = `
    <b style="color:#4db6ff">${p.name}</b><br>
    Last packet: ${new Date().toLocaleTimeString()}<br>
    Irms: ${(Math.random()*20+10).toFixed(1)} A<br>
    Voltage: ${(Math.random()*220+180).toFixed(0)} V<br>
    RSSI: -${Math.floor(Math.random()*30+60)} dBm<br>
    Confidence: ${(Math.random()*50+50).toFixed(1)}%
  `;
}

function logEvent(msg, type = 'info') {
    let color = '#e0e0e0';
    if (type === 'fault') color = '#f44336';
    if (type === 'warn') color = '#ffc107';
    
    eventLogEl.innerHTML += `<span style="color: ${color};">${new Date().toLocaleTimeString()}: ${msg}</span><br>`;
    eventLogEl.scrollTop = eventLogEl.scrollHeight;
}

function simulateFault() {
  logEvent("--- SIMULATION STARTED ---", "warn");
  setTimeout(() => logEvent("Detection → Trip → Reclose attempts → Lockout", 'fault'), 500);
  
  // Select a random pole to be the fault point
  let randPole = poles[Math.floor(Math.random()*poles.length)];
  
  // Visually update the map after a delay
  setTimeout(() => {
    markers[randPole.id].setStyle({color:"#f44336", fillColor:"#f44336"});
    lines.forEach(l=>{
      if (l.ids.includes(randPole.id)) {
        l.line.setStyle({color:"#f44336"});
      }
    });
    logEvent(`Confirmed fault near ${randPole.name}. Section locked out.`, 'fault');
  }, 1500);
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


// ---------------- Run ----------------
addPoles();
logEvent("System Initialized. All nodes reporting normal."); 