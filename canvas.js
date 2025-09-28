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
    
    // Drawing state
    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    
    // Initialize
    this.initCanvasBackground();
    this.setStroke();
    this.wirePointerEvents();
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
    
    // Set background to white (same as main canvas)
    this.offCtx.fillStyle = '#ffffff';
    this.offCtx.fillRect(0, 0, this.sampleSize, this.sampleSize);
    
    // Enable smoothing for better downsampling
    this.offCtx.imageSmoothingEnabled = true;
    this.offCtx.imageSmoothingQuality = 'high';
    
    console.log(`DEBUG Canvas: About to draw main canvas (${this.drawCanvas.width}x${this.drawCanvas.height}) to offscreen (${this.sampleSize}x${this.sampleSize})`);
    
    // Draw the main canvas scaled down to 28x28
    this.offCtx.drawImage(this.drawCanvas, 0, 0, this.sampleSize, this.sampleSize);
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
    
    // Remove existing debug canvas if any
    const existing = document.getElementById('debug-canvas-28x28');
    if (existing) existing.remove();
    
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
}
