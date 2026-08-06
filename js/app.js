/* ============================================================
   MY PARKING LOG - MAIN APPLICATION LOGIC (WITH 2-PLAYER SYNC)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Initial Vehicles (Benz E-Class & Kia Ray)
  const defaultVehicles = [
    {
      id: 'v_benz',
      name: '벤츠 E클래스 (w214)',
      type: 'sedan',
      color: 'silver',
      plate: '163어 3938',
      imageKey: 'benz_silver',
      thumb: './assets/cars/benz_silver.jpg'
    },
    {
      id: 'v_ray',
      name: '기아 레이',
      type: 'compact',
      color: 'black',
      plate: '59마 5773',
      imageKey: 'ray_black',
      thumb: './assets/cars/ray_black.jpg'
    }
  ];

  // Default initial parking values for the vehicles if empty
  const defaultParkingByVehicle = {
    'v_benz': {
      id: 'init_benz',
      vehicleId: 'v_benz',
      vehicleName: '벤츠 E클래스 (w214)',
      vehiclePlate: '163어 3938',
      vehicleImageKey: 'benz_silver',
      place: '집',
      floor: '지하 B2',
      detail: 'A-04 기둥 앞',
      note: '엘리베이터 입구 근처',
      timestamp: Date.now() - 3600000 * 2,
      gps: null
    },
    'v_ray': {
      id: 'init_ray',
      vehicleId: 'v_ray',
      vehicleName: '기아 레이',
      vehiclePlate: '59마 5773',
      vehicleImageKey: 'ray_black',
      place: '회사',
      floor: '지하 B1',
      detail: 'C-12 구역',
      note: '출구 램프 우측',
      timestamp: Date.now() - 3600000 * 5,
      gps: null
    }
  };

  // State Management
  let vehicles = JSON.parse(localStorage.getItem('mp_vehicles')) || defaultVehicles;
  let activeVehicleId = localStorage.getItem('mp_active_vehicle') || vehicles[0].id;
  
  // Independent Parking status per vehicle
  let parkingByVehicle = JSON.parse(localStorage.getItem('mp_parking_map')) || defaultParkingByVehicle;
  let parkingHistory = JSON.parse(localStorage.getItem('mp_parking_history')) || [];

  // DOM Elements
  const vehicleTabsContainer = document.getElementById('vehicleTabsContainer');
  const btnOpenVehicleModal = document.getElementById('btnOpenVehicleModal');

  // Form Elements
  const placeChoices = document.querySelectorAll('.btn-place-choice');
  const floorChoices = document.querySelectorAll('.btn-floor-choice');
  const detailInput = document.getElementById('detailInput');
  const noteInput = document.getElementById('noteInput');
  const gpsCheckbox = document.getElementById('gpsCheckbox');
  const btnSaveParking = document.getElementById('btnSaveParking');

  // Saved Card Elements
  const savedCard = document.getElementById('savedCard');
  const emptyCard = document.getElementById('emptyCard');
  const savedVehicleInfo = document.getElementById('savedVehicleInfo');
  const savedPlaceFloor = document.getElementById('savedPlaceFloor');
  const savedDetail = document.getElementById('savedDetail');
  const savedMemo = document.getElementById('savedMemo');
  const savedTime = document.getElementById('savedTime');
  const parkingTimer = document.getElementById('parkingTimer');
  const mapLink = document.getElementById('mapLink');
  const btnResetParking = document.getElementById('btnResetParking');

  // Sync Modal Elements
  const syncModal = document.getElementById('syncModal');
  const btnOpenSyncModal = document.getElementById('btnOpenSyncModal');
  const btnCloseSyncModal = document.getElementById('btnCloseSyncModal');
  const inputSyncRoomCode = document.getElementById('inputSyncRoomCode');
  const btnSaveSyncCode = document.getElementById('btnSaveSyncCode');
  const lblRoomCode = document.getElementById('lblRoomCode');

  // Vehicle & History Modals
  const vehicleModal = document.getElementById('vehicleModal');
  const btnCloseVehicleModal = document.getElementById('btnCloseVehicleModal');
  const vehicleListContainer = document.getElementById('vehicleListContainer');
  const btnShowAddVehicleForm = document.getElementById('btnShowAddVehicleForm');
  const addVehicleForm = document.getElementById('addVehicleForm');
  const inputNewVehicleName = document.getElementById('inputNewVehicleName');
  const inputNewVehiclePlate = document.getElementById('inputNewVehiclePlate');
  const selectNewVehicleType = document.getElementById('selectNewVehicleType');
  const btnSubmitNewVehicle = document.getElementById('btnSubmitNewVehicle');

  const historyModal = document.getElementById('historyModal');
  const btnOpenHistoryModal = document.getElementById('btnOpenHistoryModal');
  const btnCloseHistoryModal = document.getElementById('btnCloseHistoryModal');
  const historyListContainer = document.getElementById('historyListContainer');
  const btnToggleSound = document.getElementById('btnToggleSound');

  // Selected Form Values
  let selectedPlace = '집';
  let selectedFloor = 'B2';

  // Initialize Canvas Renderer
  const isoRenderer = new window.IsometricParkingRenderer('isometricCanvas');

  // Timer handle
  let timerInterval = null;

  // Save State & Push to Cloud Sync
  function saveState(pushToCloud = true) {
    localStorage.setItem('mp_vehicles', JSON.stringify(vehicles));
    localStorage.setItem('mp_active_vehicle', activeVehicleId);
    localStorage.setItem('mp_parking_map', JSON.stringify(parkingByVehicle));
    localStorage.setItem('mp_parking_history', JSON.stringify(parkingHistory));

    if (pushToCloud && window.cloudSync) {
      window.cloudSync.pushData({
        vehicles: vehicles,
        parkingMap: parkingByVehicle,
        history: parkingHistory
      });
    }
  }

  // Get active vehicle object
  function getActiveVehicle() {
    return vehicles.find(v => v.id === activeVehicleId) || vehicles[0];
  }

  // Render Vehicle Selector Tabs (Benz & Ray & Custom)
  function renderVehicleTabs() {
    vehicleTabsContainer.innerHTML = '';

    vehicles.forEach(v => {
      const tab = document.createElement('div');
      tab.className = `vehicle-tab ${v.id === activeVehicleId ? 'active' : ''}`;
      tab.innerHTML = `
        <div class="vehicle-tab-thumb">
          <img src="${v.thumb}" alt="${v.name}" />
        </div>
        <div class="vehicle-tab-info">
          <span class="vehicle-tab-name">${v.name}</span>
          <span class="vehicle-tab-plate">${v.plate}</span>
        </div>
      `;

      tab.addEventListener('click', () => {
        window.retroSound.playClick();
        activeVehicleId = v.id;
        saveState(false);
        renderVehicleTabs();
        renderParkingCard();
      });

      vehicleTabsContainer.appendChild(tab);
    });
  }

  // Choice Buttons Handlers
  placeChoices.forEach(btn => {
    btn.addEventListener('click', () => {
      window.retroSound.playClick();
      placeChoices.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPlace = btn.dataset.value;
    });
  });

  floorChoices.forEach(btn => {
    btn.addEventListener('click', () => {
      window.retroSound.playClick();
      floorChoices.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedFloor = btn.dataset.value;
    });
  });

  // Sound Toggle
  btnToggleSound.addEventListener('click', () => {
    const isEnabled = window.retroSound.toggleSound();
    btnToggleSound.textContent = isEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
  });

  // Render Saved Parking Card for Active Vehicle (TOP PRIORITY VISUAL)
  function renderParkingCard() {
    const activeV = getActiveVehicle();
    if (!activeV) return;

    const parkingData = parkingByVehicle[activeV.id];

    if (!parkingData) {
      savedCard.classList.add('hidden');
      emptyCard.classList.remove('hidden');
      document.getElementById('emptyCardTitle').textContent = `${activeV.name} (${activeV.plate}) 주차 위치 없음`;
      if (timerInterval) clearInterval(timerInterval);
      isoRenderer.render(null);
      return;
    }

    savedCard.classList.remove('hidden');
    emptyCard.classList.add('hidden');

    savedVehicleInfo.textContent = `${parkingData.vehicleName} (${parkingData.vehiclePlate})`;
    savedPlaceFloor.textContent = `[${parkingData.place}] ${parkingData.floor}`;
    savedDetail.textContent = `📍 ${parkingData.detail || '구역 정보 없음'}`;
    
    if (parkingData.note) {
      savedMemo.textContent = `📝 메모: ${parkingData.note}`;
      savedMemo.classList.remove('hidden');
    } else {
      savedMemo.classList.add('hidden');
    }

    const savedDate = new Date(parkingData.timestamp);
    savedTime.textContent = `⏱️ ${savedDate.getMonth() + 1}/${savedDate.getDate()} ${String(savedDate.getHours()).padStart(2, '0')}:${String(savedDate.getMinutes()).padStart(2, '0')} 저장됨`;

    if (parkingData.gps) {
      mapLink.href = `https://map.kakao.com/link/map/주차위치,${parkingData.gps.lat},${parkingData.gps.lng}`;
      mapLink.classList.remove('hidden');
    } else {
      mapLink.classList.add('hidden');
    }

    // Live Timer update
    updateParkingTimer(parkingData.timestamp);
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => updateParkingTimer(parkingData.timestamp), 1000);

    // Update Isometric Canvas Renderer
    isoRenderer.render(parkingData);
  }

  // Timer Calculation
  function updateParkingTimer(timestamp) {
    if (!timestamp) return;
    const diffMs = Date.now() - timestamp;
    const totalSec = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    parkingTimer.textContent = `⏳ 주차시간: ${hrs}시간 ${mins}분 ${secs}초`;
  }

  // Save / Change Parking Location Action
  btnSaveParking.addEventListener('click', () => {
    window.retroSound.playSuccess();
    const activeV = getActiveVehicle();

    const newParking = {
      id: Date.now().toString(),
      vehicleId: activeV.id,
      vehicleName: activeV.name,
      vehiclePlate: activeV.plate,
      vehicleImageKey: activeV.imageKey,
      place: selectedPlace,
      floor: selectedFloor,
      detail: detailInput.value.trim() || '구역 지정 안 함',
      note: noteInput.value.trim(),
      timestamp: Date.now(),
      gps: null
    };

    if (gpsCheckbox.checked && navigator.geolocation) {
      btnSaveParking.disabled = true;
      btnSaveParking.textContent = '📡 GPS 좌표 수집 중...';

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          newParking.gps = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          completeSave(newParking);
        },
        (err) => {
          console.warn('GPS Error:', err);
          completeSave(newParking);
        },
        { timeout: 5000 }
      );
    } else {
      completeSave(newParking);
    }
  });

  function completeSave(parkingObj) {
    parkingByVehicle[parkingObj.vehicleId] = parkingObj;
    parkingHistory.unshift(parkingObj);

    saveState(true); // Save and Push to 2-Player Cloud Sync

    btnSaveParking.disabled = false;
    btnSaveParking.textContent = '💾 선택된 차량 주차 위치 변경하기';

    renderParkingCard();
    alert(`🚗 [${parkingObj.vehicleName}] 주차 위치가 변경되었습니다!\n2인 공유 클라우드에도 실시간 반영되었습니다.`);
  }

  // Reset Parking Action
  btnResetParking.addEventListener('click', () => {
    const activeV = getActiveVehicle();
    if (confirm(`[${activeV.name}] 출차 완료하셨나요? 주차 기록을 초기화합니다.`)) {
      window.retroSound.playReset();
      delete parkingByVehicle[activeV.id];
      saveState(true);
      renderParkingCard();
    }
  });

  // Modal Handlers - 2-Player Sync Code
  btnOpenSyncModal.addEventListener('click', () => {
    window.retroSound.playClick();
    inputSyncRoomCode.value = window.cloudSync.getRoomCode();
    syncModal.classList.add('active');
  });

  btnCloseSyncModal.addEventListener('click', () => {
    window.retroSound.playClick();
    syncModal.classList.remove('active');
  });

  btnSaveSyncCode.addEventListener('click', () => {
    const newCode = inputSyncRoomCode.value.trim();
    if (!newCode) return;
    window.retroSound.playSuccess();
    window.cloudSync.setRoomCode(newCode);
    lblRoomCode.textContent = newCode.toUpperCase();
    syncModal.classList.remove('active');
    alert(`🔗 2인 공유 코드가 [${newCode.toUpperCase()}]로 설정되었습니다!`);
  });

  // Vehicle Management Modal Handlers
  btnOpenVehicleModal.addEventListener('click', () => {
    window.retroSound.playClick();
    renderVehicleListModal();
    vehicleModal.classList.add('active');
  });

  btnCloseVehicleModal.addEventListener('click', () => {
    window.retroSound.playClick();
    vehicleModal.classList.remove('active');
  });

  btnShowAddVehicleForm.addEventListener('click', () => {
    window.retroSound.playClick();
    addVehicleForm.classList.toggle('hidden');
  });

  btnSubmitNewVehicle.addEventListener('click', () => {
    const name = inputNewVehicleName.value.trim();
    const plate = inputNewVehiclePlate.value.trim();
    const type = selectNewVehicleType.value;

    if (!name || !plate) {
      alert('차종 이름과 차량번호를 입력해주세요!');
      return;
    }

    window.retroSound.playSuccess();

    let thumb = './assets/cars/sedan_default.jpg';
    let imageKey = 'sedan_default';
    if (type === 'suv') {
      thumb = './assets/cars/suv_blue.jpg';
      imageKey = 'suv_blue';
    } else if (type === 'compact') {
      thumb = './assets/cars/ray_black.jpg';
      imageKey = 'ray_black';
    }

    const newVehicle = {
      id: 'v_' + Date.now(),
      name: name,
      type: type,
      plate: plate,
      imageKey: imageKey,
      thumb: thumb
    };

    vehicles.push(newVehicle);
    activeVehicleId = newVehicle.id;
    saveState(true);

    inputNewVehicleName.value = '';
    inputNewVehiclePlate.value = '';
    addVehicleForm.classList.add('hidden');

    renderVehicleTabs();
    renderParkingCard();
    renderVehicleListModal();
  });

  function renderVehicleListModal() {
    vehicleListContainer.innerHTML = '';

    vehicles.forEach(v => {
      const item = document.createElement('div');
      item.className = `vehicle-item ${v.id === activeVehicleId ? 'selected' : ''}`;
      item.innerHTML = `
        <div class="vehicle-item-left">
          <div class="vehicle-pixel-thumb" style="width:40px;height:40px;">
            <img src="${v.thumb}" alt="${v.name}" />
          </div>
          <div>
            <div style="color:var(--primary-yellow);font-size:0.95rem;">${v.name} ${v.id === activeVehicleId ? '⭐[선택됨]' : ''}</div>
            <div style="color:var(--neon-cyan);font-size:0.8rem;">${v.plate}</div>
          </div>
        </div>
        <div class="vehicle-item-actions">
          <button class="btn-pixel btn-pixel-sm btn-select-vehicle" data-id="${v.id}">선택</button>
          ${vehicles.length > 1 ? `<button class="btn-pixel btn-pixel-sm btn-pixel-primary btn-delete-vehicle" data-id="${v.id}">삭제</button>` : ''}
        </div>
      `;
      vehicleListContainer.appendChild(item);
    });

    vehicleListContainer.querySelectorAll('.btn-select-vehicle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        window.retroSound.playClick();
        activeVehicleId = e.target.dataset.id;
        saveState(false);
        renderVehicleTabs();
        renderParkingCard();
        renderVehicleListModal();
      });
    });

    vehicleListContainer.querySelectorAll('.btn-delete-vehicle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        window.retroSound.playReset();
        const idToDelete = e.target.dataset.id;
        vehicles = vehicles.filter(v => v.id !== idToDelete);
        delete parkingByVehicle[idToDelete];
        if (activeVehicleId === idToDelete) {
          activeVehicleId = vehicles[0].id;
        }
        saveState(true);
        renderVehicleTabs();
        renderParkingCard();
        renderVehicleListModal();
      });
    });
  }

  // Modal Handlers - History
  btnOpenHistoryModal.addEventListener('click', () => {
    window.retroSound.playClick();
    renderHistoryModal();
    historyModal.classList.add('active');
  });

  btnCloseHistoryModal.addEventListener('click', () => {
    window.retroSound.playClick();
    historyModal.classList.remove('active');
  });

  function renderHistoryModal() {
    historyListContainer.innerHTML = '';
    if (parkingHistory.length === 0) {
      historyListContainer.innerHTML = '<div class="text-center" style="color:var(--text-muted);">저장된 주차 히스토리가 없습니다.</div>';
      return;
    }

    parkingHistory.slice(0, 10).forEach(h => {
      const date = new Date(h.timestamp);
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <div style="display:flex;justify-content:space-between;">
          <strong style="color:var(--primary-yellow);">${h.vehicleName} (${h.vehiclePlate})</strong>
          <span class="history-time">${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}</span>
        </div>
        <div style="color:#fff;margin-top:4px;">📍 [${h.place}] ${h.floor} | ${h.detail}</div>
        ${h.note ? `<div style="color:var(--text-muted);font-size:0.8rem;">📝 ${h.note}</div>` : ''}
      `;
      historyListContainer.appendChild(item);
    });
  }

  // START 2-PLAYER CLOUD AUTO SYNC SUBSCRIPTION
  if (window.cloudSync) {
    lblRoomCode.textContent = window.cloudSync.getRoomCode();

    window.cloudSync.startAutoSync((remotePayload) => {
      if (!remotePayload) return;

      let hasChanged = false;

      if (remotePayload.vehicles && JSON.stringify(remotePayload.vehicles) !== JSON.stringify(vehicles)) {
        vehicles = remotePayload.vehicles;
        localStorage.setItem('mp_vehicles', JSON.stringify(vehicles));
        hasChanged = true;
      }

      if (remotePayload.parkingMap && JSON.stringify(remotePayload.parkingMap) !== JSON.stringify(parkingByVehicle)) {
        parkingByVehicle = remotePayload.parkingMap;
        localStorage.setItem('mp_parking_map', JSON.stringify(parkingByVehicle));
        hasChanged = true;
      }

      if (remotePayload.history && JSON.stringify(remotePayload.history) !== JSON.stringify(parkingHistory)) {
        parkingHistory = remotePayload.history;
        localStorage.setItem('mp_parking_history', JSON.stringify(parkingHistory));
        hasChanged = true;
      }

      if (hasChanged) {
        renderVehicleTabs();
        renderParkingCard();
      }
    });
  }

  // Initial Run
  renderVehicleTabs();
  renderParkingCard();
});
