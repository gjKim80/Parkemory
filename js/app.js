/* ============================================================
   PARKEMORY - MAIN APP CONTROLLER WITH ONBOARDING & VEHICLE MGMT
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Default Initial Vehicles (Benz E-Class & Kia Ray)
  const defaultVehicles = [
    {
      id: 'v_benz',
      name: '벤츠 E클래스',
      plate: '163어 3938',
      thumb: './assets/cars/benz_silver.png'
    },
    {
      id: 'v_ray',
      name: '기아 레이',
      plate: '59마 5773',
      thumb: './assets/cars/ray_black.png'
    }
  ];

  // Default Parking Map
  const defaultParkingMap = {
    'v_benz': {
      id: 'p_benz',
      vehicleId: 'v_benz',
      vehicleName: '벤츠 E클래스',
      vehiclePlate: '163어 3938',
      place: '우리집 지하주차장',
      floor: 'B2',
      detail: 'A-04 기둥 앞',
      note: '엘리베이터 근처',
      timestamp: Date.now() - 3600000 * 2
    }
  };

  // State Management
  let vehicles = JSON.parse(localStorage.getItem('parkemory_vehicles')) || defaultVehicles;
  let favoritePlace = localStorage.getItem('parkemory_fav_place') || '우리집 지하주차장';
  let activeVehicleId = localStorage.getItem('parkemory_active_v') || vehicles[0].id;
  let parkingMap = JSON.parse(localStorage.getItem('parkemory_map')) || defaultParkingMap;
  let isFirstLaunch = !localStorage.getItem('parkemory_onboarded');

  // Initialize Building Engine
  const buildingEngine = new window.ParkemoryBuildingEngine('buildingTowerContainer');

  // DOM Elements
  const lblFavPlace = document.getElementById('lblFavPlace');
  const activeVehicleThumb = document.getElementById('activeVehicleThumb');
  const activeVehicleName = document.getElementById('activeVehicleName');
  const activeVehiclePlate = document.getElementById('activeVehiclePlate');
  const btnOpenOnboarding = document.getElementById('btnOpenOnboarding');
  const btnOpenSyncModal = document.getElementById('btnOpenSyncModal');
  const btnToggleSound = document.getElementById('btnToggleSound');
  const lblRoomCode = document.getElementById('lblRoomCode');

  // Onboarding & Vehicle Mgmt Modal Elements
  const onboardingModal = document.getElementById('onboardingModal');
  const btnCloseOnboarding = document.getElementById('btnCloseOnboarding');
  const inputFavPlace = document.getElementById('inputFavPlace');
  const modalVehicleListContainer = document.getElementById('modalVehicleListContainer');
  const btnToggleAddVehicleForm = document.getElementById('btnToggleAddVehicleForm');
  const addVehicleSubForm = document.getElementById('addVehicleSubForm');
  const inputNewVehicleName = document.getElementById('inputNewVehicleName');
  const inputNewVehiclePlate = document.getElementById('inputNewVehiclePlate');
  const btnSubmitNewVehicle = document.getElementById('btnSubmitNewVehicle');
  const btnSaveOnboarding = document.getElementById('btnSaveOnboarding');

  // Sync Modal Elements
  const syncModal = document.getElementById('syncModal');
  const btnCloseSyncModal = document.getElementById('btnCloseSyncModal');
  const inputSyncCode = document.getElementById('inputSyncCode');
  const btnSaveSyncCode = document.getElementById('btnSaveSyncCode');

  // Save State & Push to Cloud
  function saveState(pushToCloud = true) {
    localStorage.setItem('parkemory_vehicles', JSON.stringify(vehicles));
    localStorage.setItem('parkemory_fav_place', favoritePlace);
    localStorage.setItem('parkemory_active_v', activeVehicleId);
    localStorage.setItem('parkemory_map', JSON.stringify(parkingMap));
    localStorage.setItem('parkemory_onboarded', 'true');

    if (pushToCloud && window.cloudSync) {
      window.cloudSync.pushData({
        vehicles: vehicles,
        favoritePlace: favoritePlace,
        parkingMap: parkingMap
      });
    }
  }

  function getActiveVehicle() {
    return vehicles.find(v => v.id === activeVehicleId) || vehicles[0];
  }

  // Update Header & Summary Card
  function updateSummaryDisplay() {
    const activeV = getActiveVehicle();
    if (activeV) {
      activeVehicleName.textContent = activeV.name;
      activeVehiclePlate.textContent = activeV.plate;
      activeVehicleThumb.src = activeV.thumb || './assets/cars/benz_silver.png';
    }
    lblFavPlace.textContent = favoritePlace;
  }

  // Render 3D Building Tower (Guaranteed Execution)
  function renderBuilding() {
    updateSummaryDisplay();
    buildingEngine.render(parkingMap, getActiveVehicle(), vehicles);
  }

  // Attach Building Parking Callbacks
  buildingEngine.onParkSubmit = ({ floorId, vehicleId, detail, note }) => {
    const targetV = vehicles.find(v => v.id === vehicleId) || getActiveVehicle();

    parkingMap[targetV.id] = {
      id: 'p_' + Date.now(),
      vehicleId: targetV.id,
      vehicleName: targetV.name,
      vehiclePlate: targetV.plate,
      place: favoritePlace,
      floor: floorId,
      detail: detail || 'A-04 기둥 앞',
      note: note || '',
      timestamp: Date.now()
    };

    saveState(true);
    renderBuilding();
    buildingEngine.showToast("🎉 주차완료!");
  };

  buildingEngine.onParkReset = (vehicleId) => {
    delete parkingMap[vehicleId];
    saveState(true);
    renderBuilding();
    if (window.retroSound) window.retroSound.playReset();
  };

  // Sound Toggle
  btnToggleSound.addEventListener('click', () => {
    const isEnabled = window.retroSound.toggleSound();
    btnToggleSound.textContent = isEnabled ? '🔊 Sound' : '🔇 Sound';
  });

  // Render Vehicle List inside Modal
  function renderModalVehicleList() {
    if (!modalVehicleListContainer) return;
    modalVehicleListContainer.innerHTML = '';

    vehicles.forEach(v => {
      const isSelected = (v.id === activeVehicleId);
      const item = document.createElement('div');
      item.style.cssText = `
        background: ${isSelected ? 'rgba(0, 240, 255, 0.12)' : '#0f172a'};
        border: 1px solid ${isSelected ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)'};
        border-radius: 12px;
        padding: 10px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      `;

      item.innerHTML = `
        <div>
          <div style="font-weight:700; color:#fff; font-size:0.9rem;">
            ${v.name} ${isSelected ? '<span style="color:var(--accent-cyan); font-size:0.75rem;">(선택됨)</span>' : ''}
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted); font-family:var(--font-num);">${v.plate}</div>
        </div>
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn-select-v btn-icon-text" data-id="${v.id}" style="padding:4px 8px; font-size:0.75rem;">선택</button>
          ${vehicles.length > 1 ? `<button type="button" class="btn-delete-v btn-icon-text" data-id="${v.id}" style="padding:4px 8px; font-size:0.75rem; color:#ef4444; border-color:rgba(239, 68, 68, 0.3);">삭제</button>` : ''}
        </div>
      `;

      modalVehicleListContainer.appendChild(item);
    });

    // Select vehicle event
    modalVehicleListContainer.querySelectorAll('.btn-select-v').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (window.retroSound) window.retroSound.playClick();
        activeVehicleId = e.target.dataset.id;
        saveState(false);
        renderModalVehicleList();
        renderBuilding();
      });
    });

    // Delete vehicle event
    modalVehicleListContainer.querySelectorAll('.btn-delete-v').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (window.retroSound) window.retroSound.playReset();
        const idToDelete = e.target.dataset.id;
        vehicles = vehicles.filter(v => v.id !== idToDelete);
        delete parkingMap[idToDelete];
        if (activeVehicleId === idToDelete) {
          activeVehicleId = vehicles[0].id;
        }
        saveState(true);
        renderModalVehicleList();
        renderBuilding();
      });
    });
  }

  // Onboarding Modal Open/Close Handlers
  btnOpenOnboarding.addEventListener('click', () => {
    openOnboardingModal();
  });

  btnCloseOnboarding.addEventListener('click', () => {
    onboardingModal.classList.remove('active');
  });

  function openOnboardingModal() {
    inputFavPlace.value = favoritePlace;
    addVehicleSubForm.classList.add('hidden');
    renderModalVehicleList();
    onboardingModal.classList.add('active');
  }

  // Toggle Sub-Form for New Vehicle Addition
  btnToggleAddVehicleForm.addEventListener('click', () => {
    if (window.retroSound) window.retroSound.playClick();
    addVehicleSubForm.classList.toggle('hidden');
  });

  // Submit New Vehicle Addition
  btnSubmitNewVehicle.addEventListener('click', () => {
    const name = inputNewVehicleName.value.trim();
    const plate = inputNewVehiclePlate.value.trim();

    if (!name || !plate) {
      alert('차량 별명과 차량 번호를 모두 입력해주세요!');
      return;
    }

    if (window.retroSound) window.retroSound.playSuccess();

    const newVehicle = {
      id: 'v_' + Date.now(),
      name: name,
      plate: plate,
      thumb: './assets/cars/benz_silver.png'
    };

    vehicles.push(newVehicle);
    activeVehicleId = newVehicle.id;

    saveState(true);

    inputNewVehicleName.value = '';
    inputNewVehiclePlate.value = '';
    addVehicleSubForm.classList.add('hidden');

    renderModalVehicleList();
    renderBuilding();
    buildingEngine.showToast(`🚗 [${name}] 차량이 새로 추가되었습니다!`);
  });

  btnSaveOnboarding.addEventListener('click', () => {
    const place = inputFavPlace.value.trim();

    if (!place) {
      alert('자주 주차하는 장소명을 입력해 주세요!');
      return;
    }

    favoritePlace = place;
    saveState(true);
    onboardingModal.classList.remove('active');
    renderBuilding();
    buildingEngine.showToast("✅ 설정이 저장되었습니다!");
  });

  // 2-Player Cloud Sync Modal Handlers
  btnOpenSyncModal.addEventListener('click', () => {
    inputSyncCode.value = window.cloudSync.getRoomCode();
    syncModal.classList.add('active');
  });

  btnCloseSyncModal.addEventListener('click', () => {
    syncModal.classList.remove('active');
  });

  btnSaveSyncCode.addEventListener('click', () => {
    const code = inputSyncCode.value.trim();
    if (!code) return;
    window.cloudSync.setRoomCode(code);
    lblRoomCode.textContent = code.toUpperCase();
    syncModal.classList.remove('active');
    buildingEngine.showToast(`🔗 공유 코드 적용 완료 [${code.toUpperCase()}]`);
  });

  // Subscribe to Cloud Sync
  if (window.cloudSync) {
    lblRoomCode.textContent = window.cloudSync.getRoomCode();

    window.cloudSync.startAutoSync((remoteData) => {
      if (!remoteData) return;
      let changed = false;

      if (remoteData.vehicles && JSON.stringify(remoteData.vehicles) !== JSON.stringify(vehicles)) {
        vehicles = remoteData.vehicles;
        changed = true;
      }
      if (remoteData.favoritePlace && remoteData.favoritePlace !== favoritePlace) {
        favoritePlace = remoteData.favoritePlace;
        changed = true;
      }
      if (remoteData.parkingMap && JSON.stringify(remoteData.parkingMap) !== JSON.stringify(parkingMap)) {
        parkingMap = remoteData.parkingMap;
        changed = true;
      }

      if (changed) {
        renderBuilding();
      }
    });
  }

  // ALWAYS RENDER 3D BUILDING AT START
  renderBuilding();

  // Trigger Onboarding Modal if First Launch
  if (isFirstLaunch) {
    openOnboardingModal();
  }
});
