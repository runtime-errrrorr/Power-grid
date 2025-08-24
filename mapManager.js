// ========================== Map Manager ==========================

import { MAP_CONFIG, POLES, SUBSTATION_ID, COLOR } from './config.js';
import { appState } from './state.js';
import { getPoleMarkerEl, getLineEl, addClass, removeClass } from './utils.js';

export class MapManager {
  constructor() {
    this.map = null;
    this.initializeMap();
  }
  
  initializeMap() {
    this.map = L.map('map').setView(MAP_CONFIG.CENTER, MAP_CONFIG.ZOOM);
    L.tileLayer(MAP_CONFIG.TILE_URL, {
      attribution: MAP_CONFIG.ATTRIBUTION,
      subdomains: MAP_CONFIG.SUBDOMAINS,
      maxZoom: MAP_CONFIG.MAX_ZOOM
    }).addTo(this.map);
  }
  
  addPoles() {
    for (let i = 0; i < POLES.length; i++) {
      const p = POLES[i];
      let marker;
      
      if (p.id === SUBSTATION_ID) {
        marker = L.marker(p.coords, {
          icon: L.divIcon({
            className: "substation-icon",
            html: `<div class="triangle-marker"><img src="thunder.svg" class="thunder-icon" alt=""></div>`,
            iconSize: [44, 44]
          })
        }).addTo(this.map);
      } else {
        marker = L.circleMarker(p.coords, { 
          radius: 9, 
          color: COLOR.OK, 
          fillColor: COLOR.OK, 
          fillOpacity: 0.9 
        }).addTo(this.map);
      }
      
      marker.bindTooltip(p.name);
      marker.on("click", () => this.onPoleClick(p));
      appState.addMarker(p.id, marker);
      
      if (i > 0) {
        let prev = POLES[i - 1];
        let line = L.polyline([prev.coords, p.coords], { 
          color: COLOR.OK, 
          weight: 4, 
          opacity: 0.85 
        }).addTo(this.map);
        appState.addLine({ ids: [prev.id, p.id], line });
      }
    }
  }
  
  onPoleClick(pole) {
    // This will be set by the UI manager
    if (window.showPole) {
      window.showPole(pole);
    }
  }
  
  setPoleColor(id, color, { borderOnly = false, includeLines = true } = {}) {
    const markers = appState.getMarkers();
    const m = markers[id];
    if (!m) return;

    if (m.setStyle) {
      if (borderOnly) {
        m.setStyle({ color, fillColor: COLOR.OK }); // keep fill green
      } else {
        m.setStyle({ color, fillColor: color });
      }
    } else {
      const el = getPoleMarkerEl(markers, id);
      if (el && el.classList.contains('triangle-marker')) {
        el.style.borderBottomColor = color;
      }
      const root = m.getElement && m.getElement();
      if (root) {
        const thunder = root.querySelector(".thunder-icon");
        if (thunder) {
          thunder.style.filter = (color === COLOR.FAULT || color === COLOR.OFF) ? "invert(1)" : "none";
        }
      }
    }

    if (includeLines) {
      const lines = appState.getLines();
      lines.forEach(l => {
        if (l.ids.includes(id)) l.line.setStyle({ color });
      });
    }
  }
  
  clearAllColors() {
    POLES.forEach(p => this.setPoleColor(p.id, COLOR.OK));
    const lines = appState.getLines();
    lines.forEach(Lobj => Lobj.line.setStyle({ color: COLOR.OK }));
  }
  
  setPoleFaultIcon(poleId, svgPath) {
    this.clearPoleFaultIcon(poleId);
    const p = POLES.find(x => x.id === poleId);
    if (!p) return;
    
    const icon = L.divIcon({
      className: "fault-icon",
      html: `<img src="${svgPath}" style="width:16px;height:16px;" />`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    
    const overlay = L.marker(p.coords, { 
      icon, 
      interactive: false, 
      pane: 'markerPane' 
    }).addTo(this.map);
    
    appState.addFaultIcon(poleId, overlay);
  }
  
  clearPoleFaultIcon(poleId) {
    const faultIcons = appState.getFaultIcons();
    const overlay = faultIcons[poleId];
    if (overlay) {
      this.map.removeLayer(overlay);
      appState.removeFaultIcon(poleId);
    }
  }
  
  clearAllFaultIcons() {
    const faultIcons = appState.getFaultIcons();
    Object.keys(faultIcons).forEach(id => this.clearPoleFaultIcon(+id));
  }
  
  removeOverUnderClasses() {
    const markers = appState.getMarkers();
    const lines = appState.getLines();
    
    POLES.forEach(p => {
      const el = getPoleMarkerEl(markers, p.id);
      removeClass(el, 'overvoltage-pole');
      removeClass(el, 'undervoltage-pole');
    });
    
    lines.forEach(Lobj => {
      const lel = getLineEl(Lobj);
      removeClass(lel, 'overvoltage-line');
      removeClass(lel, 'undervoltage-line');
    });
  }
  
  removeNeutralClasses() {
    const markers = appState.getMarkers();
    const lines = appState.getLines();
    
    POLES.forEach(p => {
      const el = getPoleMarkerEl(markers, p.id);
      removeClass(el, 'pole-neutral');
    });
    
    lines.forEach(Lobj => {
      const lel = getLineEl(Lobj);
      removeClass(lel, 'line-neutral');
    });
  }
  
  resetAllVisuals() {
    this.clearAllColors();
    this.clearAllFaultIcons();
    this.removeOverUnderClasses();
    this.removeNeutralClasses();
  }
  
  getMap() {
    return this.map;
  }
}
