/**
 * PARKEMORY — 3D Cylindrical Parking Tower Building Engine
 * Renders a true 3D isometric cylinder tower + sliding drawer tray on Canvas
 */
class ParkemoryBuilding {
  constructor(canvasId, floorListId) {
    this.canvasId   = canvasId;
    this.floorListId = floorListId;
    this.openFloor  = null;          // currently open drawer floor id
    this.onPark     = null;          // callback({floorId, vehicleId, detail, note})
    this.onUnpark   = null;          // callback(vehicleId)
    this._parkingMap = {};
    this._vehicles  = [];
    this._active    = null;
    this._imgs      = {};
    this._imgSrcs   = {
      benz_silver:   './assets/cars/benz_silver.png',
      ray_black:     './assets/cars/ray_black.png',
      sedan_default: './assets/cars/sedan_default.png',
      suv_blue:      './assets/cars/suv_blue.png',
    };
    this._loadImages();

    // Floor definitions — top of building (index 0) to bottom (index 8)
    this.floors = [
      { id:'3F', label:'3F', name:'지상 3층', type:'above' },
      { id:'2F', label:'2F', name:'지상 2층', type:'above' },
      { id:'1F', label:'1F', name:'지상 1층', type:'above' },
      { id:'B1', label:'B1', name:'지하 1층', type:'under' },
      { id:'B2', label:'B2', name:'지하 2층', type:'under' },
      { id:'B3', label:'B3', name:'지하 3층', type:'under' },
      { id:'B4', label:'B4', name:'지하 4층', type:'under' },
      { id:'B5', label:'B5', name:'지하 5층', type:'under' },
      { id:'B6', label:'B6', name:'지하 6층', type:'under' },
    ];
  }

  /* ── image preload ─────────────────────────────── */
  _loadImages() {
    for (const [k, src] of Object.entries(this._imgSrcs)) {
      const img = new Image();
      img.onload = () => { this._imgs[k] = img; this._redrawCanvas(); };
      img.onerror = () => {};
      img.src = src;
    }
  }

  _carKey(vehicle) {
    if (!vehicle) return 'benz_silver';
    const n = (vehicle.name || '').toLowerCase();
    if (n.includes('레이') || n.includes('ray'))       return 'ray_black';
    if (n.includes('suv') || n.includes('팰리세이'))   return 'suv_blue';
    return 'benz_silver';
  }

  /* ── public render ─────────────────────────────── */
  render(parkingMap = {}, activeVehicle = null, vehicles = []) {
    this._parkingMap = parkingMap;
    this._active     = activeVehicle;
    this._vehicles   = vehicles;
    this._buildFloorList();
    this._redrawCanvas();
  }

  /* ── Floor list (interactive buttons + panels) ── */
  _buildFloorList() {
    const el = document.getElementById(this.floorListId);
    if (!el) return;
    el.innerHTML = '';

    for (const floor of this.floors) {
      const parked = this._parkedOn(floor.id);
      const isOpen = this.openFloor === floor.id;

      /* Row button */
      const row = document.createElement('div');
      row.className = [
        'floor-row',
        floor.type === 'above' ? 'above-ground' : 'underground',
        parked ? 'parked' : '',
      ].filter(Boolean).join(' ');

      row.innerHTML = `
        <div class="floor-row-id">${floor.label}</div>
        <div class="floor-row-info">
          <div class="floor-row-status">${parked
            ? `${parked.vehicleName} (${parked.vehiclePlate})`
            : '빈 주차 공간'}</div>
          ${parked ? `<div class="floor-row-detail">${parked.detail || ''}${parked.note ? ' | ' + parked.note : ''}</div>` : ''}
        </div>
        <div class="floor-row-badge">${parked ? '입차됨' : isOpen ? '닫기' : '열기'}</div>
      `;
      row.addEventListener('click', () => {
        this.openFloor = (this.openFloor === floor.id) ? null : floor.id;
        this._buildFloorList();
        this._redrawCanvas();
      });

      /* Panel */
      const panel = document.createElement('div');
      panel.className = 'floor-panel' + (isOpen ? ' open' : '');

      const opts = this._vehicles.map(v =>
        `<option value="${v.id}" ${this._active?.id === v.id ? 'selected' : ''}>
           ${v.name} (${v.plate})
         </option>`).join('');

      panel.innerHTML = `
        <div class="panel-title">${floor.name} (${floor.label}) 주차</div>
        <div class="panel-group">
          <label class="panel-label">주차할 차량</label>
          <select id="pSel_${floor.id}" class="panel-input">${opts}</select>
        </div>
        <div class="panel-group">
          <label class="panel-label">기둥 번호 / 위치 설명</label>
          <input id="pDet_${floor.id}" class="panel-input" type="text"
            placeholder="예: A-04 기둥 앞" value="${parked?.detail ?? ''}">
        </div>
        <div class="panel-group">
          <label class="panel-label">추가 메모 (선택)</label>
          <input id="pNote_${floor.id}" class="panel-input" type="text"
            placeholder="예: 엘리베이터 바로 옆" value="${parked?.note ?? ''}">
        </div>
        <button class="btn-park" id="pBtn_${floor.id}">
          ${parked ? '위치 변경하기' : '주차 완료'}
        </button>
        ${parked ? `<button class="btn-unpark" id="pRst_${floor.id}" data-vid="${parked.vehicleId}">
          출차 (주차 해제)
        </button>` : ''}
      `;

      panel.querySelector(`#pBtn_${floor.id}`).addEventListener('click', e => {
        e.stopPropagation();
        if (this.onPark) {
          this.onPark({
            floorId:   floor.id,
            vehicleId: panel.querySelector(`#pSel_${floor.id}`).value,
            detail:    panel.querySelector(`#pDet_${floor.id}`).value.trim(),
            note:      panel.querySelector(`#pNote_${floor.id}`).value.trim(),
          });
        }
        this.openFloor = null;
      });

      const rstBtn = panel.querySelector(`#pRst_${floor.id}`);
      if (rstBtn) {
        rstBtn.addEventListener('click', e => {
          e.stopPropagation();
          if (this.onUnpark) this.onUnpark(rstBtn.dataset.vid);
          this.openFloor = null;
        });
      }

      el.appendChild(row);
      el.appendChild(panel);
    }
  }

  _parkedOn(floorId) {
    return Object.values(this._parkingMap || {}).find(p => p && p.floor === floorId) || null;
  }

  /* ── Canvas 3D Cylinder Tower ─────────────────── */
  _redrawCanvas() {
    const canvas = document.getElementById(this.canvasId);
    if (!canvas) return;

    /* Size canvas to its CSS width */
    const W = canvas.parentElement?.clientWidth || 400;
    const N = this.floors.length;       // number of floors
    const FLOOR_H = 44;                 // px per floor
    const PAD_TOP  = 28;
    const PAD_BOT  = 14;
    const H = PAD_TOP + N * FLOOR_H + PAD_BOT;

    canvas.width  = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');

    /* ── Background ─────────────────────────────── */
    ctx.clearRect(0, 0, W, H);
    const bgG = ctx.createLinearGradient(0, 0, 0, H);
    bgG.addColorStop(0, '#060c18'); bgG.addColorStop(1, '#040810');
    ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);

    // Subtle center glow
    const atmG = ctx.createRadialGradient(W*.45, H*.5, 0, W*.45, H*.5, W*.6);
    atmG.addColorStop(0, 'rgba(0,80,200,.07)'); atmG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = atmG; ctx.fillRect(0, 0, W, H);

    /* ── Cylinder geometry params ────────────────── */
    const cx  = W * 0.38;              // cylinder center X (left side)
    const RX  = Math.min(W * 0.27, 98); // horizontal radius
    const RY  = RX * 0.26;            // vertical radius (perspective compression)
    const topY = PAD_TOP;

    /* Label colors cycling — above ground pink, underground cyan */
    const labelPalette = {
      above: ['#f9a8d4', '#e879f9', '#f9a8d4'],  // pinks / magentas
      under: ['#93c5fd', '#7dd3fc', '#67e8f9'],   // light blues
    };

    /* ── Draw floors back→front (high-index first) ─ */
    for (let i = N - 1; i >= 0; i--) {
      const floor   = this.floors[i];
      const fTopY   = topY + i * FLOOR_H;
      const fBotY   = fTopY + FLOOR_H;
      const fMidY   = (fTopY + fBotY) / 2;
      const parked  = this._parkedOn(floor.id);
      const isAbove = floor.type === 'above';
      const isOpenD = this.openFloor === floor.id;

      /* ─ Floor face (bounded by lower arcs + sides) */
      ctx.save();
      ctx.beginPath();
      // Lower arc of top ellipse: L→R going clockwise through the bottom
      ctx.ellipse(cx, fTopY, RX, RY, 0, Math.PI, 0, false);
      ctx.lineTo(cx + RX, fBotY);
      // Lower arc of bottom ellipse: R→L
      ctx.ellipse(cx, fBotY, RX, RY, 0, 0, Math.PI, false);
      ctx.closePath();

      if (parked) {
        const g = ctx.createLinearGradient(cx - RX, 0, cx + RX, 0);
        g.addColorStop(0,   'rgba(0,240,255,.04)');
        g.addColorStop(.45, 'rgba(0,240,255,.30)');
        g.addColorStop(1,   'rgba(0,240,255,.04)');
        ctx.fillStyle = g;
        ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 16;
        ctx.strokeStyle = 'rgba(0,240,255,.85)'; ctx.lineWidth = 1.5;
      } else if (isOpenD) {
        ctx.fillStyle = isAbove ? 'rgba(120,80,220,.11)' : 'rgba(0,90,160,.13)';
        ctx.strokeStyle = isAbove ? 'rgba(160,100,240,.45)' : 'rgba(0,160,230,.42)';
        ctx.lineWidth = .8;
      } else {
        ctx.fillStyle = isAbove ? 'rgba(100,60,200,.07)' : 'rgba(0,50,110,.09)';
        ctx.strokeStyle = isAbove ? 'rgba(130,80,220,.18)' : 'rgba(0,110,190,.16)';
        ctx.lineWidth = .5;
      }
      ctx.fill(); ctx.stroke();
      ctx.restore();

      /* ─ Top ring ellipse (full) */
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, fTopY, RX, RY, 0, 0, Math.PI * 2);
      if (parked) {
        ctx.fillStyle = 'rgba(0,240,255,.18)';
        ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 1.5;
        ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 10;
      } else if (isOpenD) {
        ctx.fillStyle = isAbove ? 'rgba(120,80,220,.13)' : 'rgba(0,90,160,.15)';
        ctx.strokeStyle = isAbove ? 'rgba(160,100,240,.4)' : 'rgba(0,160,230,.38)';
        ctx.lineWidth = 1;
      } else {
        ctx.fillStyle = isAbove ? 'rgba(100,60,200,.08)' : 'rgba(0,50,110,.1)';
        ctx.strokeStyle = isAbove ? 'rgba(130,80,220,.3)' : 'rgba(0,110,190,.25)';
        ctx.lineWidth = .8;
      }
      ctx.fill(); ctx.stroke();
      ctx.restore();

      /* ─ Ground level dashed line between 1F and B1 */
      if (floor.id === '1F') {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(10, fBotY); ctx.lineTo(W - 10, fBotY);
        ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1.3;
        ctx.setLineDash([5, 4]); ctx.stroke();
        ctx.font = '600 8px Outfit, sans-serif';
        ctx.fillStyle = '#4ade80'; ctx.textAlign = 'right';
        ctx.setLineDash([]);
        ctx.fillText('GROUND LEVEL', W - 12, fBotY - 4);
        ctx.restore();
      }

      /* ─ Floor label + Car name text */
      const palette = labelPalette[floor.type];
      const lc = parked  ? '#00f0ff'
               : floor.id === '1F' ? '#4ade80'
               : palette[i % palette.length];

      // Floor number
      ctx.save();
      const fs = Math.max(20, Math.round(FLOOR_H * .55));
      ctx.font = `900 ${fs}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = lc;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      if (parked) { ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 18; }
      const floorLabelX = cx - RX * .88;
      const floorLabelY = fMidY + FLOOR_H * .08;
      ctx.fillText(floor.label, floorLabelX, floorLabelY);

      // Car name — right next to the floor number
      if (parked) {
        const floorLabelW = ctx.measureText(floor.label).width;
        ctx.shadowBlur = 0;
        const ns = Math.max(11, Math.round(FLOOR_H * .27));
        ctx.font = `800 ${ns}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.fillText(parked.vehicleName, floorLabelX + floorLabelW + 8, floorLabelY);
      } else if (isOpenD) {
        const floorLabelW = ctx.measureText(floor.label).width;
        const ns = Math.max(10, Math.round(FLOOR_H * .24));
        ctx.font = `600 ${ns}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.shadowBlur = 0;
        ctx.fillText('입차 선택 중...', floorLabelX + floorLabelW + 8, floorLabelY);
      }
      ctx.restore();

      /* ─ Tray glow strip (parked or open) */
      if (parked || isOpenD) {
        const trayLeft = cx + RX * .55;
        const trayTop  = fTopY + FLOOR_H * .1;
        const trayW    = RX * .95;
        const trayH    = FLOOR_H * .78;
        this._drawTray(ctx, trayLeft, trayTop, trayW, trayH, !!parked);
      }
    }

    /* ── Crown cap (top of cylinder) ───────────── */
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, topY, RX, RY, 0, 0, Math.PI * 2);
    const capG = ctx.createRadialGradient(cx, topY, 0, cx, topY, RX);
    capG.addColorStop(0, '#3c4f72'); capG.addColorStop(1, '#1b2a44');
    ctx.fillStyle = capG; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.24)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 9px Outfit, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('PARKEMORY 3D TOWER', cx, topY);
    ctx.restore();
  }

  _drawTray(ctx, x, y, w, h, occupied) {
    const pY = w * .13; // perspective Y drop (right side slightly lower)
    ctx.save();

    // Underside strip
    ctx.beginPath();
    ctx.moveTo(x,   y + h);
    ctx.lineTo(x+w, y + h + pY);
    ctx.lineTo(x+w, y + h + pY + 4);
    ctx.lineTo(x,   y + h + 4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,200,240,.32)'; ctx.fill();

    // Right side
    ctx.beginPath();
    ctx.moveTo(x+w, y + pY);
    ctx.lineTo(x+w, y + h + pY);
    ctx.lineTo(x+w, y + h + pY + 4);
    ctx.lineTo(x+w, y + pY + 4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,200,240,.2)'; ctx.fill();

    // Top surface (main platform)
    ctx.beginPath();
    ctx.moveTo(x,   y);
    ctx.lineTo(x+w, y + pY);
    ctx.lineTo(x+w, y + h + pY);
    ctx.lineTo(x,   y + h);
    ctx.closePath();

    if (occupied) {
      const g = ctx.createLinearGradient(x, 0, x+w, 0);
      g.addColorStop(0, 'rgba(0,240,255,.22)');
      g.addColorStop(1, 'rgba(0,200,255,.06)');
      ctx.fillStyle = g;
      ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 22;
      ctx.strokeStyle = 'rgba(0,240,255,.9)';
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      ctx.shadowColor = 'rgba(255,255,255,.15)'; ctx.shadowBlur = 6;
      ctx.strokeStyle = 'rgba(255,255,255,.2)';
    }
    ctx.fill();
    ctx.lineWidth = 1.3; ctx.stroke();
    ctx.restore();
  }

  _drawCar(ctx, x, y, w, h, parkedVehicle) {
    const pY = w * .13;
    const v  = this._vehicles.find(v => v.id === parkedVehicle.vehicleId);
    const img = this._imgs[this._carKey(v)];

    const cW = w * .80;
    const cH = h * .78;
    const cX = x + (w - cW) / 2;
    const cY = y + (h - cH) / 2 + pY * .35;

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 14;
      ctx.drawImage(img, cX, cY, cW, cH);
      ctx.restore();
    } else {
      // emoji fallback
      ctx.save();
      ctx.font = `${Math.round(h*.65)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 10;
      ctx.fillText('🚗', x + w/2, y + h/2 + pY*.3);
      ctx.restore();
    }

    // Underglow puddle
    const ug = ctx.createLinearGradient(cX, y+h+pY, cX, y+h+pY+22);
    ug.addColorStop(0, 'rgba(0,240,255,.22)'); ug.addColorStop(1, 'transparent');
    ctx.fillStyle = ug;
    ctx.fillRect(x+4, y+h+pY, w-8, 22);
  }

  /* ── Toast notification ─────────────────────── */
  showToast(msg = '🎉 주차완료!') {
    let t = document.getElementById('pk-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'pk-toast'; t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    if (window.retroSound) window.retroSound.playSuccess();
    setTimeout(() => t.classList.remove('show'), 2700);
  }
}

window.ParkemoryBuilding = ParkemoryBuilding;
