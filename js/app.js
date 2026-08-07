/* ============================================================
   PARKEMORY - MAIN APP CONTROLLER WITH ONBOARDING & CLOUD SYNC
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

  // Modals
  const onboardingModal = document.getElementById('onboardingModal');
  const btnCloseOnboarding = document.getElementById('btnCloseOnboarding');
  const inputVehicleName = document.getElementById('inputVehicleName');
  const inputVehiclePlate = document.getElementById('inputVehiclePlate');
  const inputFavPlace = document.getElementById('inputFavPlace');
  const btnSaveOnboarding = document.getElementById('btnSaveOnboarding');

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

  // Render 3D Building Tower
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

  // Onboarding Modal Handlers
  btnOpenOnboarding.addEventListener('click', () => {
    openOnboardingModal();
  });

  btnCloseOnboarding.addEventListener('click', () => {
    onboardingModal.classList.remove('active');
  });

  function openOnboardingModal() {
    const activeV = getActiveVehicle();
    inputVehicleName.value = activeV ? activeV.name : '벤츠 E클래스';
    inputVehiclePlate.value = activeV ? activeV.plate : '163어 3938';
    inputFavPlace.value = favoritePlace;
    onboardingModal.classList.add('active');
  }

  btnSaveOnboarding.addEventListener('click', () => {
    const name = inputVehicleName.value.trim();
    const plate = inputVehiclePlate.value.trim();
    const place = inputFavPlace.value.trim();

    if (!name || !plate || !place) {
      alert('모든 필수 정보를 입력해 주세요!');
      return;
    }

    let activeV = getActiveVehicle();
    activeV.name = name;
    activeV.plate = plate;
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

  // Trigger Onboarding on First Launch
  if (isFirstLaunch) {
    openOnboardingModal();
  } else {
    renderBuilding();
  }
});
