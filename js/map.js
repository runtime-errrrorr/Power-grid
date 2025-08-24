// ================= Map & Poles =================
function addPoles(map) {
    for (let i = 0; i < poles.length; i++) {
      const p = poles[i];
      let marker;
      if (p.id === SUBSTATION_ID) {
        marker = L.marker(p.coords, {
          icon: L.divIcon({
            className: "substation-icon",
            html: `<div class="triangle-marker"><img src="thunder.svg" class="thunder-icon" alt=""></div>`,
            iconSize: [44, 44]
          })
        }).addTo(map);
      } else {
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
  
      if (i > 0) {
        let prev = poles[i - 1];
        let line = L.polyline([prev.coords, p.coords], {
          color: COLOR.OK,
          weight: 4,
          opacity: 0.85
        }).addTo(map);
        lines.push({ ids: [prev.id, p.id], line });
      }
    }
  }
  
  function setPoleColor(id, color, { borderOnly = false, includeLines = true } = {}) {
    const m = markers[id];
    if (!m) return;
  
    if (m.setStyle) {
      if (borderOnly) {
        m.setStyle({ color, fillColor: COLOR.OK });
      } else {
        m.setStyle({ color, fillColor: color });
      }
    } else {
      const el = getPoleMarkerEl(id);
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
      lines.forEach(l => {
        if (l.ids.includes(id)) l.line.setStyle({ color });
      });
    }
  }
  
  function clearAllColors() {
    poles.forEach(p => setPoleColor(p.id, COLOR.OK));
    lines.forEach(Lobj => Lobj.line.setStyle({ color: COLOR.OK }));
  }
  