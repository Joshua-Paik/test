// TensorFlow.js Model Loading and Prediction Module
// yayayay

class MNISTModel {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.isLoaded = false;
    this.loadError = null;
  }

  async loadModel(modelPath = 'tfjs_model/model.json') {
    const cacheBuster = Date.now();
    const modelPathWithCache = `${modelPath}?v=${cacheBuster}`;
    if (this.isLoaded) {
      return this.model;
    }

    if (this.isLoading) {
      // Wait for existing load to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.model;
    }

    try {
      this.isLoading = true;
      this.loadError = null;

      // Fetch model JSON for inspection
      const response = await fetch(modelPathWithCache, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to fetch model.json (${response.status} ${response.statusText})`);
      }
      const modelJson = await response.json();

      this.model = await tf.loadLayersModel(modelPathWithCache);
      
      this.isLoaded = true;
      return this.model;
      
    } catch (error) {
      console.error('Failed to load model:', error);
      this.loadError = error;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  preprocessImage(imageData) {
    // Convert ImageData or canvas to tensor
    let tensor;
    
    if (imageData instanceof ImageData) {
      // Convert ImageData to grayscale tensor
      tensor = tf.browser.fromPixels(imageData, 1);
    } else if (imageData instanceof HTMLCanvasElement) {
      // Convert canvas to grayscale tensor
      tensor = tf.browser.fromPixels(imageData, 1);
    } else {
      throw new Error('Unsupported image data type');
    }

    // Resize to 28x28 if needed
    if (tensor.shape[0] !== 28 || tensor.shape[1] !== 28) {
      tensor = tf.image.resizeBilinear(tensor, [28, 28]);
    }

    // Normalize to [0, 1] range
    tensor = tensor.div(255.0);

    // CRITICAL: Invert colors for MNIST format
    // MNIST expects white digits on black background (1 = white, 0 = black)
    // Our canvas has black digits on white background, so we need to invert
    tensor = tf.sub(1.0, tensor);

    // Add batch dimension: (1, 28, 28, 1)
    tensor = tensor.expandDims(0);

    return tensor;
  }

  async predict(imageData) {
    if (!this.isLoaded) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    try {
      // Preprocess the image
      const inputTensor = this.preprocessImage(imageData);
      
      // Make prediction
      const prediction = this.model.predict(inputTensor);
      
      // Get probabilities array
      const probabilities = await prediction.data();
      
      // Find predicted class
      const predictedClass = prediction.argMax(-1).dataSync()[0];
      const confidence = Math.max(...probabilities);
      
      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();
      
      return {
        predictedDigit: predictedClass,
        confidence: confidence,
        probabilities: Array.from(probabilities)
      };
      
    } catch (error) {
      console.error('Prediction failed:', error);
      throw error;
    }
  }

  // Get model info
  getModelInfo() {
    if (!this.isLoaded) {
      return null;
    }

    return {
      inputShape: this.model.inputs[0].shape,
      outputShape: this.model.outputs[0].shape,
      totalParams: this.model.countParams(),
      layers: this.model.layers.length
    };
  }

  // Check if model is ready
  isReady() {
    return this.isLoaded && !this.isLoading && !this.loadError;
  }

  // Get loading status
  getStatus() {
    if (this.loadError) return 'error';
    if (this.isLoading) return 'loading';
    if (this.isLoaded) return 'ready';
    return 'not-loaded';
  }

  // Debug function to visualize the processed tensor
  async debugTensor(tensor) {
    // Debug tensor processing (visualization disabled)
  }
}
