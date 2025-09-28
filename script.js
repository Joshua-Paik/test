// Main Application Logic
(function() {
  // Initialize canvas drawing and model
  const canvas = new CanvasDrawing('draw');
  const model = new MNISTModel();
  
  // Get UI elements
  const predictBtn = document.getElementById('predictBtn');
  const clearBtn = document.getElementById('clearBtn');
  const predEl = document.getElementById('prediction');
  
  // Initialize the application
  async function initializeApp() {
    try {
      // Show loading state
      predEl.textContent = 'Loading...';
      predictBtn.disabled = true;
      
      // Load the model
      await model.loadModel();
      
      // Model loaded successfully
      predEl.textContent = '—';
      predictBtn.disabled = false;
      
      console.log('Model info:', model.getModelInfo());
      console.log('Application ready!');
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      predEl.textContent = 'Error';
      predictBtn.disabled = true;
      
      // Show user-friendly error message
      alert('Failed to load the AI model. Please check your internet connection and refresh the page.');
    }
  }
  
  function clearCanvas() {
    canvas.clear();
    predEl.textContent = '—';
  }
  
  async function predictDigit() {
    if (!model.isReady()) {
      console.warn('Model not ready');
      return;
    }
    
    try {
      console.log('DEBUG Script: Starting prediction process...');
      
      // Show loading state
      predEl.textContent = '...';
      predictBtn.disabled = true;
      
      // First, update the 28x28 canvas by calling getImageData28x28
      console.log('DEBUG Script: Updating 28x28 canvas...');
      canvas.getImageData28x28(); // This updates the offscreen canvas
      
      // Get the 28x28 canvas for prediction
      const canvas28x28 = canvas.get28x28Canvas();
      console.log('DEBUG Script: Got 28x28 canvas:', canvas28x28.width, 'x', canvas28x28.height);
      
      // Make prediction
      console.log('DEBUG Script: Calling model.predict...');
      const result = await model.predict(canvas28x28);
      
      // Display result
      predEl.textContent = String(result.predictedDigit);
      
      // Log detailed results for debugging
      console.log('DEBUG Script: Prediction result:', result);
      console.log(`DEBUG Script: Predicted: ${result.predictedDigit} (${(result.confidence * 100).toFixed(1)}% confidence)`);
      
    } catch (error) {
      console.error('Prediction failed:', error);
      predEl.textContent = '?';
      alert('Prediction failed. Please try again.');
    } finally {
      predictBtn.disabled = false;
    }
  }
  
  // Wire up event listeners
  predictBtn.addEventListener('click', predictDigit);
  clearBtn.addEventListener('click', clearCanvas);
  
  // Initialize the application
  initializeApp();
})();