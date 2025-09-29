// Canvas Drawing Module
class CanvasDrawing {
  constructor(canvasId) {
    this.deviceScale = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    
    this.drawCanvas = document.getElementById(canvasId);
    this.drawCtx = this.drawCanvas.getContext('2d');
    
    // Backing store for crisp lines on HiDPI
    this.cssSize = 280; // displayed dimension in CSS px
    this.backingSize = this.cssSize * this.deviceScale;
    
    // Set up canvas dimensions
    this.drawCanvas.style.width = this.cssSize + 'px';
    this.drawCanvas.style.height = this.cssSize + 'px';
    this.drawCanvas.width = this.backingSize;
    this.drawCanvas.height = this.backingSize;
    
    // Offscreen 28x28 resample target for ML processing
    this.sampleSize = 28;
    this.offscreen = document.createElement('canvas');
    this.offscreen.width = this.sampleSize;
    this.offscreen.height = this.sampleSize;
    this.offCtx = this.offscreen.getContext('2d');

    // Temporary buffer for recentering adjustments
    this.tempCanvas = document.createElement('canvas');
    this.tempCanvas.width = this.sampleSize;
    this.tempCanvas.height = this.sampleSize;
    this.tempCtx = this.tempCanvas.getContext('2d');

    // Preview widget for visualizing preprocessing output
    this.previewCanvas = null;
    this.previewCtx = null;
    
    // Drawing state
    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    
    // Initialize
    this.initCanvasBackground();
    this.setStroke();
    this.wirePointerEvents();
    this.initPreviewWidget();
  }
  
  initCanvasBackground() {
    this.drawCtx.save();
    this.drawCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawCtx.fillStyle = '#ffffff';
    this.drawCtx.fillRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
    this.drawCtx.restore();
  }
  
  setStroke() {
    this.drawCtx.lineJoin = 'round';
    this.drawCtx.lineCap = 'round';
    this.drawCtx.lineWidth = 20 * this.deviceScale; // Fixed brush size
    this.drawCtx.strokeStyle = '#000000'; // Fixed black ink
  }
  
  getPos(evt) {
    const rect = this.drawCanvas.getBoundingClientRect();
    const x = (evt.clientX - rect.left) * (this.drawCanvas.width / rect.width);
    const y = (evt.clientY - rect.top) * (this.drawCanvas.height / rect.height);
    return { x, y };
  }
  
  onPointerDown = (e) => {
    e.preventDefault();
    this.isDrawing = true;
    this.setStroke();
    const { x, y } = this.getPos(e);
    this.lastX = x;
    this.lastY = y;
    this.drawCtx.beginPath();
    this.drawCtx.moveTo(x, y);
  }
  
  onPointerMove = (e) => {
    if (!this.isDrawing) return;
    const { x, y } = this.getPos(e);
    this.drawCtx.lineTo(x, y);
    this.drawCtx.stroke();
    this.lastX = x;
    this.lastY = y;
  }
  
  onPointerUp = (e) => {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.drawCtx.closePath();
  }
  
  onLeave = (e) => {
    if (this.isDrawing) this.onPointerUp(e);
  }
  
  wirePointerEvents() {
    this.drawCanvas.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp, { passive: false });
    this.drawCanvas.addEventListener('pointerleave', this.onLeave, { passive: true });
  }
  
  clear() {
    this.initCanvasBackground();
    if (this.previewCtx) {
      this.renderPreview(true);
    }
  }
  
  getImageData28x28() {
    // Copy draw canvas to 28x28 for ML processing
    this.offCtx.save();
    
    // DEBUG: Check main canvas state first
    const mainImageData = this.drawCtx.getImageData(0, 0, this.drawCanvas.width, this.drawCanvas.height);
    const mainPixelSum = Array.from(mainImageData.data).reduce((sum, val, idx) => {
      if (idx % 4 === 0) return sum + val; // Red channel
      return sum;
    }, 0);
    console.log(`DEBUG Canvas: Main canvas (${this.drawCanvas.width}x${this.drawCanvas.height}) pixel sum: ${mainPixelSum}`);
    console.log(`DEBUG Canvas: Main canvas total pixels: ${this.drawCanvas.width * this.drawCanvas.height}`);
    console.log(`DEBUG Canvas: Main canvas average pixel value: ${mainPixelSum / (this.drawCanvas.width * this.drawCanvas.height)}`);
    
    const width = this.drawCanvas.width;
    const height = this.drawCanvas.height;
    const data = mainImageData.data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let sumX = 0;
    let sumY = 0;
    let weightTotal = 0;

    const darknessThreshold = 0.2; // Heuristic threshold for ink detection

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3] / 255;
        const grayscale = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const darkness = (1 - grayscale) * a;

        if (darkness > darknessThreshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
          sumX += x * darkness;
          sumY += y * darkness;
          weightTotal += darkness;
        }
      }
    }

    const hasInk = maxX >= 0 && maxY >= 0;

    this.offCtx.fillStyle = '#ffffff';
    this.offCtx.fillRect(0, 0, this.sampleSize, this.sampleSize);
    this.offCtx.imageSmoothingEnabled = true;
    this.offCtx.imageSmoothingQuality = 'high';

    if (!hasInk) {
      console.log('DEBUG Canvas: No ink detected, falling back to direct scale.');
      this.offCtx.drawImage(this.drawCanvas, 0, 0, this.sampleSize, this.sampleSize);
      this.offCtx.restore();
      // Generate data URL of the 28x28 image
      const url = this.offscreen.toDataURL('image/png');
      console.log(`DEBUG Canvas: Data URL length: ${url.length}`);
      return url;
    }

    const boundsWidth = maxX - minX + 1;
    const boundsHeight = maxY - minY + 1;
    const padding = Math.round(0.2 * Math.max(boundsWidth, boundsHeight));
    const paddedMinX = Math.max(0, minX - padding);
    const paddedMinY = Math.max(0, minY - padding);
    const paddedMaxX = Math.min(width - 1, maxX + padding);
    const paddedMaxY = Math.min(height - 1, maxY + padding);
    const srcWidth = paddedMaxX - paddedMinX + 1;
    const srcHeight = paddedMaxY - paddedMinY + 1;

    const targetInnerSize = this.sampleSize - 8; // Keep a margin around the digit
    const scale = targetInnerSize / Math.max(srcWidth, srcHeight);
    const destWidth = srcWidth * scale;
    const destHeight = srcHeight * scale;

    const centerOfMassX = weightTotal > 0 ? sumX / weightTotal : (paddedMinX + paddedMaxX) / 2;
    const centerOfMassY = weightTotal > 0 ? sumY / weightTotal : (paddedMinY + paddedMaxY) / 2;
    const comRelativeX = (centerOfMassX - paddedMinX) * scale;
    const comRelativeY = (centerOfMassY - paddedMinY) * scale;

    const baseDx = (this.sampleSize - destWidth) / 2;
    const baseDy = (this.sampleSize - destHeight) / 2;
    let dx = baseDx + (this.sampleSize / 2 - (baseDx + comRelativeX));
    let dy = baseDy + (this.sampleSize / 2 - (baseDy + comRelativeY));

    const maxDx = this.sampleSize - destWidth;
    const maxDy = this.sampleSize - destHeight;
    dx = Math.min(Math.max(dx, 0), maxDx);
    dy = Math.min(Math.max(dy, 0), maxDy);

    console.log('DEBUG Canvas: Preprocessing bounds', {
      minX: paddedMinX,
      minY: paddedMinY,
      maxX: paddedMaxX,
      maxY: paddedMaxY,
      destWidth,
      destHeight,
      dx,
      dy,
      centerOfMassX,
      centerOfMassY
    });

    this.offCtx.drawImage(
      this.drawCanvas,
      paddedMinX,
      paddedMinY,
      srcWidth,
      srcHeight,
      dx,
      dy,
      destWidth,
      destHeight
    );

    // Recompute center of mass on the 28x28 canvas and recentre if needed
    const processedData = this.offCtx.getImageData(0, 0, this.sampleSize, this.sampleSize);
    const processed = processedData.data;
    let processedSumX = 0;
    let processedSumY = 0;
    let processedWeight = 0;

    for (let y = 0; y < this.sampleSize; y++) {
      for (let x = 0; x < this.sampleSize; x++) {
        const idx = (y * this.sampleSize + x) * 4;
        const r = processed[idx];
        const g = processed[idx + 1];
        const b = processed[idx + 2];
        const a = processed[idx + 3] / 255;
        const grayscale = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const darkness = (1 - grayscale) * a;

        if (darkness > darknessThreshold) {
          processedSumX += x * darkness;
          processedSumY += y * darkness;
          processedWeight += darkness;
        }
      }
    }

    if (processedWeight > 0) {
      const processedComX = processedSumX / processedWeight;
      const processedComY = processedSumY / processedWeight;
      const shiftX = Math.round(this.sampleSize / 2 - processedComX);
      const shiftY = Math.round(this.sampleSize / 2 - processedComY);

      if (shiftX !== 0 || shiftY !== 0) {
        this.tempCtx.fillStyle = '#ffffff';
        this.tempCtx.fillRect(0, 0, this.sampleSize, this.sampleSize);
        this.tempCtx.drawImage(this.offscreen, 0, 0);

        this.offCtx.fillStyle = '#ffffff';
        this.offCtx.fillRect(0, 0, this.sampleSize, this.sampleSize);
        this.offCtx.drawImage(this.tempCanvas, shiftX, shiftY);
      }
    }

    this.offCtx.restore();
    
    // DEBUG: Log canvas state
    const imageData = this.offCtx.getImageData(0, 0, this.sampleSize, this.sampleSize);
    const pixelSum = Array.from(imageData.data).reduce((sum, val, idx) => {
      // Only count every 4th value (alpha channel) or use grayscale conversion
      if (idx % 4 === 0) return sum + val; // Red channel
      return sum;
    }, 0);
    console.log(`DEBUG Canvas: 28x28 canvas pixel sum (red channel): ${pixelSum}`);
    console.log(`DEBUG Canvas: 28x28 canvas average pixel value: ${pixelSum / (this.sampleSize * this.sampleSize)}`);
    console.log(`DEBUG Canvas: First 20 red pixels:`, Array.from(imageData.data).filter((_, idx) => idx % 4 === 0).slice(0, 20));
    
    // Update preview widget
    this.renderPreview();
    
    // Generate data URL of the 28x28 image
    const url = this.offscreen.toDataURL('image/png');
    console.log(`DEBUG Canvas: Data URL length: ${url.length}`);
    return url;
  }
  
  // Get the raw canvas for advanced operations
  getCanvas() {
    return this.drawCanvas;
  }
  
  // Get the 28x28 offscreen canvas
  get28x28Canvas() {
    return this.offscreen;
  }

  initPreviewWidget() {
    // Try to get the preview canvas element
    this.previewCanvas = document.getElementById('preprocessPreview');
    console.log('DEBUG Preview: Canvas element found:', !!this.previewCanvas);
    this.previewCtx = this.previewCanvas ? this.previewCanvas.getContext('2d') : null;
    console.log('DEBUG Preview: Context obtained:', !!this.previewCtx);
    
    if (this.previewCtx) {
      console.log('Preview widget initialized successfully');
      console.log('DEBUG Preview: Canvas dimensions:', this.previewCanvas.width, 'x', this.previewCanvas.height);
      this.renderPreview(true);
    } else {
      console.warn('Preview canvas not found - widget will not be available');
    }
  }

  renderPreview(isClear = false) {
    if (!this.previewCtx || !this.previewCanvas) {
      console.log('DEBUG Preview: renderPreview called but no context available');
      return;
    }

    console.log('DEBUG Preview: renderPreview called, isClear:', isClear);
    this.previewCtx.save();
    this.previewCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);

    if (isClear) {
      console.log('DEBUG Preview: Clearing preview with dark background');
      this.previewCtx.fillStyle = '#111827';
      this.previewCtx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      this.previewCtx.restore();
      return;
    }

    // Fill with dark background to match MNIST style
    this.previewCtx.fillStyle = '#111827';
    this.previewCtx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);

    // Disable smoothing for pixelated look
    this.previewCtx.imageSmoothingEnabled = false;
    
    console.log('DEBUG Preview: Drawing offscreen canvas to preview');
    console.log('DEBUG Preview: Offscreen canvas dimensions:', this.offscreen.width, 'x', this.offscreen.height);
    
    // Draw the 28x28 processed image scaled up to fit the preview canvas
    this.previewCtx.drawImage(this.offscreen, 0, 0, this.previewCanvas.width, this.previewCanvas.height);

    this.previewCtx.restore();
    console.log('DEBUG Preview: renderPreview completed');
  }
}
