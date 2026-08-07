/* ============================================================
   PARKEMORY - 3D SECTIONAL BUILDING & DRAWER ANIMATION ENGINE
   ============================================================ */

class ParkemoryBuildingEngine {
  constructor(towerContainerId) {
    this.container = document.getElementById(towerContainerId);
    this.openDrawerFloorId = null;
    this.onParkSubmit = null;
    this.onParkReset = null;

    // Define building floors (Above-ground and Underground)
    this.floors = [
      { id: '3F', name: '지상 3층', type: 'above' },
      { id: '2F', name: '지상 2층', type: 'above' },
      { id: '1F', name: '지상 1층', type: 'above' },
      { id: 'B1', name: '지하 1층', type: 'under' },
      { id: 'B2', name: '지하 2층', type: 'under' },
      { id: 'B3', name: '지하 3층', type: 'under' },
      { id: 'B4', name: '지하 4층', type: 'under' },
      { id: 'B5', name: '지하 5층', type: 'under' },
      { id: 'B6', name: '지하 6층', type: 'under' }
    ];
  }

  // Render Sectional Cutaway Building Rows
  render(parkingMap, activeVehicle, vehicles) {
    if (!this.container) return;
    this.container.innerHTML = '';

    this.floors.forEach(floor => {
      // Find if any vehicle is parked on this floor
      const parkedVehicle = Object.values(parkingMap || {}).find(p => p && p.floor === floor.id);

      // Create Floor Row Element
      const row = document.createElement('div');
      row.className = `floor-drawer-row ${floor.type === 'above' ? 'above-ground' : 'underground'} ${parkedVehicle ? 'parked-active' : ''}`;
      row.dataset.floorId = floor.id;

      // Status text
      let statusHtml = '<span class="floor-status-text">빈 주차 공간</span>';
      let subDetailHtml = '';

      if (parkedVehicle) {
        statusHtml = `<span class="floor-status-text" style="color:var(--accent-cyan);">🚗 ${parkedVehicle.vehicleName} (${parkedVehicle.vehiclePlate})</span>`;
        subDetailHtml = `<div class="floor-sub-detail">📍 ${parkedVehicle.detail || '구역 지정됨'} ${parkedVehicle.note ? '| ' + parkedVehicle.note : ''}</div>`;
      }

      row.innerHTML = `
        <div class="floor-number-badge">${floor.id}</div>
        <div class="floor-status-content">
          ${statusHtml}
          ${subDetailHtml}
        </div>
        <div class="drawer-handle">${parkedVehicle ? '✓' : '▼'}</div>
      `;

      // Create Expandable Drawer Parking Panel
      const panel = document.createElement('div');
      panel.className = `drawer-expanded-panel ${this.openDrawerFloorId === floor.id ? 'open' : ''}`;
      panel.id = `drawer_panel_${floor.id}`;

      // Vehicle selection dropdown options
      const vehicleOptions = (vehicles || []).map(v => 
        `<option value="${v.id}" ${activeVehicle && activeVehicle.id === v.id ? 'selected' : ''}>${v.name} (${v.plate})</option>`
      ).join('');

      panel.innerHTML = `
        <div style="font-weight:700; color:#fff; margin-bottom:10px; font-size:0.88rem;">
          ${floor.name} (${floor.id}) 서랍 주차
        </div>
        <div class="drawer-form-group">
          <label class="drawer-form-label">주차할 차량 선택</label>
          <select id="drawer_vehicle_select_${floor.id}" class="modern-input">
            ${vehicleOptions}
          </select>
        </div>
        <div class="drawer-form-group">
          <label class="drawer-form-label">기둥 번호 및 위치 설명</label>
          <input type="text" id="drawer_detail_${floor.id}" class="modern-input" placeholder="예: A-04 기둥 앞, 엘리베이터 근처" value="${parkedVehicle ? parkedVehicle.detail : 'A-04 기둥 앞'}">
        </div>
        <div class="drawer-form-group">
          <label class="drawer-form-label">추가 메모 (선택)</label>
          <input type="text" id="drawer_note_${floor.id}" class="modern-input" placeholder="예: 3호기 입구 오른쪽" value="${parkedVehicle && parkedVehicle.note ? parkedVehicle.note : ''}">
        </div>

        <button type="button" class="btn-park-submit" data-floor="${floor.id}">
          ${parkedVehicle ? '🔄 주차 위치 변경하기' : '🚗 서랍 속에 차 넣기 (주차완료)'}
        </button>

        ${parkedVehicle ? `<button type="button" class="btn-park-reset" data-floor="${floor.id}" data-vehicle-id="${parkedVehicle.vehicleId}">출차 (주차 해제)</button>` : ''}
      `;

      // Attach Drawer Slide Open/Close Event
      row.addEventListener('click', () => {
        if (window.retroSound) window.retroSound.playClick();
        if (this.openDrawerFloorId === floor.id) {
          this.openDrawerFloorId = null; // Close if opened
        } else {
          this.openDrawerFloorId = floor.id; // Open selected drawer
        }
        this.render(parkingMap, activeVehicle, vehicles);
      });

      // Attach Park Action inside Panel
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

      // Attach Reset Action inside Panel
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

      this.container.appendChild(row);
      this.container.appendChild(panel);
    });
  }

  // Trigger Toast Notification ("주차완료!")
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
