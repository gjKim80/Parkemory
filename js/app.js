/**
 * PARKEMORY — Main Application Controller
 */
document.addEventListener('DOMContentLoaded', () => {

  /* ── Default data ──────────────────────────────── */
  const DEFAULT_VEHICLES = [
    { id:'v_benz', name:'벤츠 E클래스', plate:'163어 3938', thumb:'./assets/cars/benz_silver.png' },
    { id:'v_ray',  name:'기아 레이',    plate:'59마 5773',  thumb:'./assets/cars/ray_black.png'   },
  ];
  const DEFAULT_PARKING = {
    v_benz: { id:'p0', vehicleId:'v_benz', vehicleName:'벤츠 E클래스', vehiclePlate:'163어 3938',
              place:'우리집 지하주차장', floor:'B2', detail:'A-04 기둥 앞', note:'엘리베이터 근처', timestamp: Date.now() - 3600000 }
  };

  /* ── State ─────────────────────────────────────── */
  let vehicles      = JSON.parse(localStorage.getItem('pk_vehicles'))    || DEFAULT_VEHICLES;
  let parkingMap    = JSON.parse(localStorage.getItem('pk_map'))         || DEFAULT_PARKING;
  let favoritePlace = localStorage.getItem('pk_place')                   || '우리집 지하주차장';
  let activeVehId   = localStorage.getItem('pk_active')                  || vehicles[0].id;

  /* ── Building Engine ───────────────────────────── */
  const building = new ParkemoryBuilding('buildingCanvas', 'floorList');

  building.onPark = ({ floorId, vehicleId, detail, note }) => {
    const v = vehicles.find(v => v.id === vehicleId) || getActive();
    parkingMap[v.id] = {
      id: 'p' + Date.now(),
      vehicleId: v.id, vehicleName: v.name, vehiclePlate: v.plate,
      place: favoritePlace, floor: floorId,
      detail: detail || '', note: note || '',
      timestamp: Date.now(),
    };
    save(); renderAll();
    building.showToast('🎉 주차완료!');
  };

  building.onUnpark = vehicleId => {
    delete parkingMap[vehicleId];
    save(); renderAll();
    if (window.retroSound) window.retroSound.playReset();
  };

  /* ── Helpers ───────────────────────────────────── */
  function getActive() { return vehicles.find(v => v.id === activeVehId) || vehicles[0]; }

  function save(pushCloud = true) {
    localStorage.setItem('pk_vehicles', JSON.stringify(vehicles));
    localStorage.setItem('pk_map',      JSON.stringify(parkingMap));
    localStorage.setItem('pk_place',    favoritePlace);
    localStorage.setItem('pk_active',   activeVehId);
    localStorage.setItem('pk_onboarded', '1');
    window._parkemoryVehicles = vehicles;   // expose for building engine car-key lookup
    if (pushCloud && window.cloudSync) {
      window.cloudSync.pushData({ vehicles, favoritePlace, parkingMap });
    }
  }

  function renderAll() {
    const av = getActive();
    // Vehicle card
    document.getElementById('vcName').textContent  = av?.name  || '';
    document.getElementById('vcPlate').textContent = av?.plate || '';
    document.getElementById('vcPlace').textContent = favoritePlace;
    if (av?.thumb) document.getElementById('vcImg').src = av.thumb;
    // Building
    window._parkemoryVehicles = vehicles;
    building.render(parkingMap, av, vehicles);
  }

  /* ── Sound toggle ──────────────────────────────── */
  const btnSound = document.getElementById('btnSound');
  btnSound?.addEventListener('click', () => {
    const on = window.retroSound?.toggleSound?.();
    btnSound.textContent = on ? '🔊 Sound' : '🔇 Sound';
  });

  /* ── Settings Modal ────────────────────────────── */
  const modalSettings  = document.getElementById('modalSettings');
  const inputPlace     = document.getElementById('inputPlace');
  const vehList        = document.getElementById('vehList');
  const btnToggleAdd   = document.getElementById('btnToggleAddVeh');
  const addVehForm     = document.getElementById('addVehForm');
  const inputVehName   = document.getElementById('inputVehName');
  const inputVehPlate  = document.getElementById('inputVehPlate');

  function openSettings() {
    inputPlace.value = favoritePlace;
    renderVehList();
    addVehForm.classList.add('hidden');
    modalSettings.classList.add('show');
  }

  function renderVehList() {
    vehList.innerHTML = '';
    vehicles.forEach(v => {
      const div = document.createElement('div');
      div.className = 'veh-item' + (v.id === activeVehId ? ' selected' : '');
      div.innerHTML = `
        <div>
          <div class="veh-item-name">${v.name} ${v.id === activeVehId ? '<span style="color:var(--cyan);font-size:.72rem;">(선택됨)</span>' : ''}</div>
          <div class="veh-item-plate">${v.plate}</div>
        </div>
        <div class="veh-item-btns">
          <button class="btn-sel" data-id="${v.id}">선택</button>
          ${vehicles.length > 1 ? `<button class="btn-del" data-id="${v.id}">삭제</button>` : ''}
        </div>`;
      vehList.appendChild(div);
    });

    vehList.querySelectorAll('.btn-sel').forEach(b => b.addEventListener('click', e => {
      activeVehId = e.target.dataset.id;
      save(false); renderVehList(); renderAll();
    }));
    vehList.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', e => {
      const id = e.target.dataset.id;
      vehicles    = vehicles.filter(v => v.id !== id);
      delete parkingMap[id];
      if (activeVehId === id) activeVehId = vehicles[0]?.id;
      save(true); renderVehList(); renderAll();
    }));
  }

  document.getElementById('btnSettings')?.addEventListener('click', openSettings);
  document.getElementById('btnCloseSettings')?.addEventListener('click', () => modalSettings.classList.remove('show'));

  btnToggleAdd?.addEventListener('click', () => addVehForm.classList.toggle('hidden'));

  document.getElementById('btnAddVeh')?.addEventListener('click', () => {
    const name  = inputVehName.value.trim();
    const plate = inputVehPlate.value.trim();
    if (!name || !plate) { alert('차량 이름과 번호를 입력해주세요.'); return; }
    const nv = { id:'v'+Date.now(), name, plate, thumb:'./assets/cars/benz_silver.png' };
    vehicles.push(nv);
    activeVehId = nv.id;
    inputVehName.value = ''; inputVehPlate.value = '';
    addVehForm.classList.add('hidden');
    save(true); renderVehList(); renderAll();
    building.showToast(`🚗 [${name}] 차량 추가 완료!`);
  });

  document.getElementById('btnSaveSettings')?.addEventListener('click', () => {
    favoritePlace = inputPlace.value.trim() || favoritePlace;
    save(true); renderAll();
    modalSettings.classList.remove('show');
    building.showToast('✅ 설정 저장 완료!');
  });

  /* ── Sync Modal ────────────────────────────────── */
  const modalSync = document.getElementById('modalSync');
  document.getElementById('btnSync')?.addEventListener('click', () => {
    document.getElementById('inputSyncCode').value = window.cloudSync?.getRoomCode?.() || 'PARK-2026';
    modalSync.classList.add('show');
  });
  document.getElementById('btnCloseSync')?.addEventListener('click', () => modalSync.classList.remove('show'));
  document.getElementById('btnSaveSync')?.addEventListener('click', () => {
    const code = document.getElementById('inputSyncCode').value.trim().toUpperCase();
    if (!code) return;
    window.cloudSync?.setRoomCode?.(code);
    document.getElementById('lblRoom').textContent = code;
    modalSync.classList.remove('show');
    building.showToast(`🔗 공유 코드 [${code}] 적용 완료!`);
  });

  /* ── Cloud Sync subscription ───────────────────── */
  if (window.cloudSync) {
    document.getElementById('lblRoom').textContent = window.cloudSync.getRoomCode?.() || 'PARK-2026';
    window.cloudSync.startAutoSync?.(remote => {
      if (!remote) return;
      let changed = false;
      if (remote.vehicles   && JSON.stringify(remote.vehicles)    !== JSON.stringify(vehicles))    { vehicles    = remote.vehicles;    changed = true; }
      if (remote.favoritePlace && remote.favoritePlace !== favoritePlace)                           { favoritePlace = remote.favoritePlace; changed = true; }
      if (remote.parkingMap && JSON.stringify(remote.parkingMap) !== JSON.stringify(parkingMap))   { parkingMap  = remote.parkingMap;  changed = true; }
      if (changed) renderAll();
    });
  }

  /* ── Initial render ────────────────────────────── */
  save(false);
  renderAll();

  // Trigger first-launch settings if no data saved
  if (!localStorage.getItem('pk_onboarded')) {
    openSettings();
  }

  // Redraw on window resize (canvas size recalc)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderAll, 180);
  });
});
