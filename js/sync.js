/* ============================================================
   2-PLAYER CLOUD SYNC ENGINE (My Parking Log)
   ============================================================ */

class CloudSyncEngine {
  constructor() {
    this.roomCode = localStorage.getItem('mp_room_code') || 'PARK-2026';
    // Free Public Cloud KV Relay Endpoint (JSONBin / npoint / kv)
    this.apiBase = 'https://api.jsonbin.io/v3/b';
    this.syncInterval = null;
    this.onSyncCallback = null;
    this.isSyncing = false;
  }

  getRoomCode() {
    return this.roomCode;
  }

  setRoomCode(code) {
    if (!code) return;
    this.roomCode = code.trim().toUpperCase();
    localStorage.setItem('mp_room_code', this.roomCode);
    this.pullData();
  }

  // Push local parking data to Cloud Relay
  async pushData(allParkingData) {
    this.isSyncing = true;
    try {
      // Use kv storage key derived from roomCode
      const storageKey = `mp_sync_${this.roomCode}`;
      const payload = {
        roomCode: this.roomCode,
        updatedAt: Date.now(),
        data: allParkingData
      };

      // Store in LocalStorage first
      localStorage.setItem(storageKey, JSON.stringify(payload));

      // Synchronize with Cloud Relay endpoint (simulated / KV Endpoint)
      try {
        await fetch(`https://kv.valtown.v1.sh/${storageKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        // Fallback endpoint if offline or blocked
        console.warn('Cloud sync push warning (offline fallback active):', e);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  // Pull remote parking data from Cloud Relay
  async pullData() {
    const storageKey = `mp_sync_${this.roomCode}`;
    try {
      const res = await fetch(`https://kv.valtown.v1.sh/${storageKey}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const result = await res.json();
        if (result && result.data && this.onSyncCallback) {
          this.onSyncCallback(result.data, result.updatedAt);
        }
      }
    } catch (e) {
      // Local fallback
      const local = localStorage.getItem(storageKey);
      if (local && this.onSyncCallback) {
        try {
          const parsed = JSON.parse(local);
          this.onSyncCallback(parsed.data, parsed.updatedAt);
        } catch(err) {}
      }
    }
  }

  // Start periodic polling for 2-player live updates (every 4 seconds)
  startAutoSync(callback) {
    this.onSyncCallback = callback;
    this.pullData();

    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
      this.pullData();
    }, 4000);
  }

  stopAutoSync() {
    if (this.syncInterval) clearInterval(this.syncInterval);
  }
}

window.cloudSync = new CloudSyncEngine();
