/* ============================================================
   PARKEMORY - TRUE 3D ISOMETRIC CUTAWAY BUILDING CANVAS RENDERER
   ============================================================ */

class ParkemoryBuildingEngine {
  constructor(towerContainerId) {
    this.containerId = towerContainerId || 'buildingTowerContainer';
    this.container = document.getElementById(this.containerId);
    this.openDrawerFloorId = null;
    this.onParkSubmit = null;
    this.onParkReset = null;

    this.carImages = {};
    this.preloadCarImages();

    // Define building floors from top (3F) to bottom (B6)
    this.floors = [
      { id: '3F', name: '지상 3층', type: 'above', levelIndex: 0 },
      { id: '2F', name: '지상 2층', type: 'above', levelIndex: 1 },
      { id: '1F', name: '지상 1층', type: 'above', levelIndex: 2 },
      { id: 'B1', name: '지하 1층', type: 'under', levelIndex: 3 },
      { id: 'B2', name: '지하 2층', type: 'under', levelIndex: 4 },
      { id: 'B3', name: '지하 3층', type: 'under', levelIndex: 5 },
      { id: 'B4', name: '지하 4층', type: 'under', levelIndex: 6 },
      { id: 'B5', name: '지하 5층', type: 'under', levelIndex: 7 },
      { id: 'B6', name: '지하 6층', type: 'under', levelIndex: 8 }
    ];
  }

  preloadCarImages() {
    const cars = {
      'benz_silver': './assets/cars/benz_silver.png',
      'ray_black': './assets/cars/ray_black.png',
      'sedan_default': './assets/cars/sedan_default.png',
      'suv_blue': './assets/cars/suv_blue.png'
    };

    Object.entries(cars).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        this.carImages[key] = img;
        if (this.currentParkingMap) {
          this.render(this.currentParkingMap, this.currentActiveVehicle, this.currentVehicles);
        }
      };
    });
  }

  // Render True 3D Cutaway Building
  render(parkingMap = {}, activeVehicle = null, vehicles = []) {
    this.currentParkingMap = parkingMap;
    this.currentActiveVehicle = activeVehicle;
    this.currentVehicles = vehicles;

    if (!this.container) {
      this.container = document.getElementById(this.containerId);
    }
    if (!this.container) return;

    this.container.innerHTML = '';

    // Create 3D Building Tower Canvas & Interactive Drawer List
    const towerWrapper = document.createElement('div');
    towerWrapper.className = 'true-3d-building-wrapper';

    // Canvas Element for Rendering Integrated 3D Isometric Building Cutaway
    const canvas = document.createElement('canvas');
    canvas.id = 'buildingCutawayCanvas';
    canvas.className = 'building-cutaway-canvas';
    towerWrapper.appendChild(canvas);

    // Interactive Floor Selector Buttons Overlay
    const floorList = document.createElement('div');
    floorList.className = 'building-floor-overlay-list';

    this.floors.forEach(floor => {
      const parkedVehicle = Object.values(parkingMap || {}).find(p => p && p.floor === floor.id);

      const btnRow = document.createElement('div');
      btnRow.className = `building-floor-btn ${parkedVehicle ? 'active-parked' : ''} ${this.openDrawerFloorId === floor.id ? 'drawer-opened' : ''}`;
      
      let statusInfo = '<span class="floor-empty-txt">빈 주차 공간</span>';
      if (parkedVehicle) {
        statusInfo = `<span class="floor-parked-txt">🚗 ${parkedVehicle.vehicleName} (${parkedVehicle.vehiclePlate})</span>`;
      }

      btnRow.innerHTML = `
        <div class="floor-label-badge">${floor.id}</div>
        <div class="floor-btn-info">
          ${statusInfo}
          ${parkedVehicle ? `<div style="font-size:0.75rem; color:var(--text-muted);">📍 ${parkedVehicle.detail || '구역 지정됨'}</div>` : ''}
        </div>
        <div class="floor-drawer-icon">${parkedVehicle ? '✓ 입차됨' : '서랍 열기 ▼'}</div>
      `;

      // Drawer Expand Panel
      const panel = document.createElement('div');
      panel.className = `iso-drawer-panel ${this.openDrawerFloorId === floor.id ? 'open' : ''}`;

      const vehicleList = (vehicles && vehicles.length > 0) ? vehicles : [
        { id: 'v_benz', name: '벤츠 E클래스', plate: '163어 3938' },
        { id: 'v_ray', name: '기아 레이', plate: '59마 5773' }
      ];

      const vehicleOptions = vehicleList.map(v => 
        `<option value="${v.id}" ${activeVehicle && activeVehicle.id === v.id ? 'selected' : ''}>${v.name} (${v.plate})</option>`
      ).join('');

      panel.innerHTML = `
        <div style="font-weight:800; color:#fff; margin-bottom:12px; font-size:0.9rem; display:flex; justify-content:space-between; align-items:center;">
          <span>🏢 ${floor.name} (${floor.id}) 서랍 주차 공간</span>
          <span style="font-size:0.75rem; color:var(--accent-cyan);">3D DRAWER</span>
        </div>
        <div class="drawer-form-group">
          <label class="drawer-form-label">주차할 차량 선택</label>
          <select id="drawer_vehicle_select_${floor.id}" class="modern-input">
            ${vehicleOptions}
          </select>
        </div>
        <div class="drawer-form-group">
          <label class="drawer-form-label">기둥 번호 및 위치 설명</label>
          <input type="text" id="drawer_detail_${floor.id}" class="modern-input" placeholder="예: A-04 기둥 앞, 3호기 엘리베이터 근처" value="${parkedVehicle ? parkedVehicle.detail : 'A-04 기둥 앞'}">
        </div>
        <div class="drawer-form-group">
          <label class="drawer-form-label">추가 메모 (선택)</label>
          <input type="text" id="drawer_note_${floor.id}" class="modern-input" placeholder="예: 출구 우측 계단 앞" value="${parkedVehicle && parkedVehicle.note ? parkedVehicle.note : ''}">
        </div>

        <button type="button" class="btn-park-submit" data-floor="${floor.id}">
          ${parkedVehicle ? '🔄 주차 위치 변경하기' : '🚗 서랍 속에 차 넣기 (주차완료)'}
        </button>

        ${parkedVehicle ? `<button type="button" class="btn-park-reset" data-floor="${floor.id}" data-vehicle-id="${parkedVehicle.vehicleId}">출차 (주차 해제)</button>` : ''}
      `;

      btnRow.addEventListener('click', () => {
        if (window.retroSound) window.retroSound.playClick();
        this.openDrawerFloorId = (this.openDrawerFloorId === floor.id) ? null : floor.id;
        this.render(parkingMap, activeVehicle, vehicles);
      });

      const submitBtn = panel.querySelector('.btn-park-submit');
      if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const vehicleId = panel.querySelector(`#drawer_vehicle_select_${floor.id}`).value;
          const detail = panel.querySelector(`#drawer_detail_${floor.id}`).value.trim();
          const note = panel.querySelector(`#drawer_note_${floor.id}`).value.trim();

          if (this.onParkSubmit) {
            this.onParkSubmit({ floorId: floor.id, vehicleId, detail, note });
          }
          this.openDrawerFloorId = null;
        });
      }

      const resetBtn = panel.querySelector('.btn-park-reset');
      if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const vehicleId = resetBtn.dataset.vehicleId;
          if (this.onParkReset) {
            this.onParkReset(vehicleId);
          }
          this.openDrawerFloorId = null;
        });
      }

      floorList.appendChild(btnRow);
      floorList.appendChild(panel);
    });

    towerWrapper.appendChild(floorList);
    this.container.appendChild(towerWrapper);

    // Draw True 3D Cutaway Building Graphics on Canvas
    setTimeout(() => this.drawCanvasBuilding(canvas, parkingMap), 50);
  }

  // Draw 3D Isometric Cutaway Building Structure on Canvas
  drawCanvasBuilding(canvas, parkingMap) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    const w = rect.width || 420;
    const h = 480;
    canvas.width = w;
    canvas.height = h;

    // Background Dark Slate Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a0d18');
    bgGrad.addColorStop(1, '#05070d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Building Center Geometry
    const centerX = w / 2;
    const startY = 40;
    const floorH = 44;
    const bldW = 280;
    const depth = 80;

    // Draw Roof Top Surface
    ctx.fillStyle = '#26334d';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(centerX, startY);
    ctx.lineTo(centerX + bldW / 2, startY + depth / 2);
    ctx.lineTo(centerX, startY + depth);
    ctx.lineTo(centerX - bldW / 2, startY + depth / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Roof Logo Text
    ctx.font = '800 12px "Outfit", sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.textAlign = 'center';
    ctx.fillText('PARKEMORY 3D TOWER', centerX, startY + depth / 2 + 4);

    // Draw Each 3D Floor Layer Stack
    this.floors.forEach((floor, idx) => {
      const topY = startY + depth / 2 + idx * floorH;
      const isUnderground = floor.type === 'under';
      const parkedVehicle = Object.values(parkingMap || {}).find(p => p && p.floor === floor.id);

      // Floor Colors
      let frontColor = isUnderground ? '#111827' : '#1e293b';
      let sideColor = isUnderground ? '#0b0f19' : '#151e2e';
      let accentGlow = isUnderground ? '#00f0ff' : '#8b5cf6';

      if (parkedVehicle) {
        frontColor = 'rgba(0, 240, 255, 0.25)';
        sideColor = 'rgba(0, 240, 255, 0.35)';
      }

      // Draw Left Front Facet
      ctx.fillStyle = frontColor;
      ctx.strokeStyle = parkedVehicle ? '#00f0ff' : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = parkedVehicle ? 2 : 1;

      ctx.beginPath();
      ctx.moveTo(centerX - bldW / 2, topY);
      ctx.lineTo(centerX, topY + depth / 2);
      ctx.lineTo(centerX, topY + depth / 2 + floorH);
      ctx.lineTo(centerX - bldW / 2, topY + floorH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw Right Front Facet
      ctx.fillStyle = sideColor;
      ctx.beginPath();
      ctx.moveTo(centerX, topY + depth / 2);
      ctx.lineTo(centerX + bldW / 2, topY);
      ctx.lineTo(centerX + bldW / 2, topY + floorH);
      ctx.lineTo(centerX, topY + depth / 2 + floorH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw Large 3D Floor Label Typography on Building Face
      ctx.font = '900 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = parkedVehicle ? '#00f0ff' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(floor.id, centerX - bldW / 4, topY + floorH / 2 + 10);

      // Draw Parked Car Icon & Glow Light if vehicle is parked
      if (parkedVehicle) {
        // Spotlight Glow Effect
        ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.beginPath();
        ctx.ellipse(centerX + bldW / 4, topY + floorH / 2 + 4, 30, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Car Image Sprite or Fallback Icon
        const carImg = this.carImages[parkedVehicle.vehicleImageKey || 'benz_silver'];
        if (carImg && carImg.complete) {
          ctx.drawImage(carImg, centerX + bldW / 4 - 24, topY + floorH / 2 - 20, 48, 48);
        } else {
          ctx.font = '14px sans-serif';
          ctx.fillText('🚗', centerX + bldW / 4, topY + floorH / 2 + 4);
        }
      }

      // Draw Ground Street Level Line between 1F and B1
      if (floor.id === '1F') {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(10, topY + floorH);
        ctx.lineTo(w - 10, topY + floorH);
        ctx.stroke();

        ctx.font = '700 11px "Pretendard", sans-serif';
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'right';
        ctx.fillText('━━ GROUND STREET LEVEL ━━', w - 16, topY + floorH - 6);
      }
    });
  }

  showToast(message = "🎉 주차완료!") {
    let toast = document.getElementById('parkemoryToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'parkemoryToast';
      toast.className = 'toast-notification';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');

    if (window.retroSound) window.retroSound.playSuccess();

    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }
}

window.ParkemoryBuildingEngine = ParkemoryBuildingEngine;
