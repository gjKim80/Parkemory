/* ============================================================
   8-BIT ISOMETRIC PARKING LOT CANVAS RENDERER (TRANSPARENT PNG CARS)
   ============================================================ */

class IsometricParkingRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    // Loaded transparent PNG car images cache
    this.carImages = {};
    this.currentData = null;
    this.pulseAngle = 0;

    // Handle high DPI
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.preloadCarImages();
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
        if (this.currentData) this.render(this.currentData);
      };
    });
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    if (this.currentData) this.render(this.currentData);
  }

  // Convert 2D Grid (x, y) to 2.5D Isometric (isoX, isoY)
  toIso(x, y, originX, originY, tileW = 88, tileH = 44) {
    const isoX = originX + (x - y) * (tileW / 2);
    const isoY = originY + (x + y) * (tileH / 2);
    return { x: isoX, y: isoY };
  }

  render(parkingData) {
    this.currentData = parkingData;
    if (!this.ctx) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear background
    this.ctx.fillStyle = '#0a0914';
    this.ctx.fillRect(0, 0, width, height);

    // Origin point for isometric grid
    const originX = width / 2;
    const originY = height / 2 - 45;

    const tileW = 88;
    const tileH = 44;
    const gridCols = 3;
    const gridRows = 3;

    // Draw Isometric Floor Tiles (Dark Asphalt)
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const { x, y } = this.toIso(c, r, originX, originY, tileW, tileH);
        this.drawIsoTile(x, y, tileW, tileH, (r + c) % 2 === 0 ? '#1b192a' : '#151422');
      }
    }

    // Draw Clear Parking Slot Lines
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const { x, y } = this.toIso(c, r, originX, originY, tileW, tileH);
        const isTargetSlot = (c === 1 && r === 1);
        this.drawIsoParkingSlotLines(x, y, tileW, tileH, isTargetSlot);
      }
    }

    // Draw Isometric Concrete Pillar (A-04 / B-02)
    const pillarPos = this.toIso(0, 0, originX, originY, tileW, tileH);
    this.drawIsoPillar(pillarPos.x, pillarPos.y, tileW, tileH, parkingData ? parkingData.detail || 'A-04' : 'A-01');

    // Draw Level Floor Banner Text
    const floorText = parkingData ? parkingData.floor : 'B1';
    const placeText = parkingData ? parkingData.place : '집';
    this.drawFloorHeader(floorText, placeText);

    // Draw Parked Car inside Center Slot (1, 1)
    if (parkingData) {
      const carPos = this.toIso(1, 1, originX, originY, tileW, tileH);

      // Draw Spotlight/Glow inside parking slot
      this.drawSpotlight(carPos.x, carPos.y, tileW, tileH);

      // Render Transparent PNG Car Image
      const carImageKey = parkingData.vehicleImageKey || 'benz_silver';
      let img = this.carImages[carImageKey] || this.carImages['benz_silver'];

      if (img && img.complete) {
        const carW = 104;
        const carH = 104;
        this.ctx.drawImage(img, carPos.x - carW / 2, carPos.y - carH / 2 - 16, carW, carH);
      } else {
        // Dynamic Pixel Iso Car Fallback
        const isSilver = (carImageKey === 'benz_silver');
        this.drawDynamicPixelIsoCar(carPos.x, carPos.y - 12, isSilver ? '#d0d4dc' : '#22252a');
      }

      // Draw Floating Pixel Tag over car
      this.drawFloatingTag(carPos.x, carPos.y - 64, `${parkingData.vehicleName} (${parkingData.vehiclePlate})`);
    } else {
      // Draw Empty Slot Indicator
      const emptyPos = this.toIso(1, 1, originX, originY, tileW, tileH);
      this.drawEmptySlotIndicator(emptyPos.x, emptyPos.y);
    }
  }

  drawIsoTile(x, y, w, h, fillColor) {
    this.ctx.fillStyle = fillColor;
    this.ctx.strokeStyle = '#0e0d18';
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    this.ctx.moveTo(x, y - h / 2);
    this.ctx.lineTo(x + w / 2, y);
    this.ctx.lineTo(x, y + h / 2);
    this.ctx.lineTo(x - w / 2, y);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }

  drawIsoParkingSlotLines(x, y, w, h, isTarget) {
    this.ctx.strokeStyle = isTarget ? '#ffea00' : '#4a4768';
    this.ctx.lineWidth = isTarget ? 3 : 2;

    this.ctx.beginPath();
    this.ctx.moveTo(x - w / 2, y);
    this.ctx.lineTo(x, y - h / 2);
    this.ctx.lineTo(x + w / 2, y);
    this.ctx.moveTo(x - w / 2, y);
    this.ctx.lineTo(x, y + h / 2);
    this.ctx.lineTo(x + w / 2, y);
    this.ctx.stroke();

    if (isTarget) {
      this.ctx.strokeStyle = '#39ff14';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x - 18, y - 4);
      this.ctx.lineTo(x + 18, y + 4);
      this.ctx.stroke();
    }
  }

  drawIsoPillar(x, y, w, h, label) {
    const pillarH = 54;
    const pw = 30;

    this.ctx.fillStyle = '#56537a';
    this.ctx.fillRect(x - pw / 2, y - pillarH - h / 4, pw / 2, pillarH);

    this.ctx.fillStyle = '#3f3c5b';
    this.ctx.fillRect(x, y - pillarH - h / 4, pw / 2, pillarH);

    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x - pw / 2, y - pillarH - h / 4, pw, pillarH);

    this.ctx.fillStyle = '#ffea00';
    this.ctx.fillRect(x - pw / 2, y - pillarH + 12, pw, 8);

    this.ctx.font = '10px "NeoDGM", sans-serif';
    this.ctx.fillStyle = '#000000';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(label.slice(0, 5), x, y - pillarH + 19);
  }

  drawSpotlight(x, y, w, h) {
    this.pulseAngle += 0.05;
    const alpha = 0.35 + Math.sin(this.pulseAngle) * 0.15;

    this.ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, w / 2 - 4, h / 2 - 4, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawDynamicPixelIsoCar(x, y, bodyColor) {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y + 10, 32, 14, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = bodyColor;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;

    this.ctx.beginPath();
    this.ctx.moveTo(x - 30, y);
    this.ctx.lineTo(x, y - 15);
    this.ctx.lineTo(x + 30, y);
    this.ctx.lineTo(x, y + 15);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = bodyColor === '#22252a' ? '#333842' : '#e6e9f0';
    this.ctx.beginPath();
    this.ctx.moveTo(x - 16, y - 10);
    this.ctx.lineTo(x, y - 22);
    this.ctx.lineTo(x + 16, y - 10);
    this.ctx.lineTo(x, y + 2);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#00f0ff';
    this.ctx.fillRect(x - 8, y - 14, 16, 8);

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(x - 24, y + 6, 8, 8);
    this.ctx.fillRect(x + 16, y + 6, 8, 8);

    this.ctx.restore();
  }

  drawFloatingTag(x, y, text) {
    this.ctx.font = '11px "NeoDGM", sans-serif';
    const textWidth = this.ctx.measureText(text).width;
    const padding = 6;

    this.ctx.fillStyle = '#ff007f';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;

    this.ctx.fillRect(x - textWidth / 2 - padding, y - 10, textWidth + padding * 2, 20);
    this.ctx.strokeRect(x - textWidth / 2 - padding, y - 10, textWidth + padding * 2, 20);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
  }

  drawEmptySlotIndicator(x, y) {
    this.ctx.font = '11px "NeoDGM", sans-serif';
    this.ctx.fillStyle = '#7a76a0';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('주차 구역 (비어있음)', x, y);
  }

  drawFloorHeader(floor, place) {
    this.ctx.font = '13px "NeoDGM", sans-serif';
    this.ctx.fillStyle = '#39ff14';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`[${place}] 층수: ${floor}`, 14, 24);
  }
}

window.IsometricParkingRenderer = IsometricParkingRenderer;
