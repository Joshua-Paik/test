// TensorFlow.js Model Loading and Prediction Module
class MNISTModel {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.isLoaded = false;
    this.loadError = null;
  }

  async loadModel(modelPath = 'tfjs_model/model.json') {
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
      
      console.log('Loading TensorFlow.js model from:', modelPath);
      console.log('TensorFlow.js version:', tf.version);
      this.model = await tf.loadLayersModel(modelPath);
      console.log('Model loaded successfully!');
      console.log('Model input shape:', this.model.inputs[0].shape);
      console.log('Model output shape:', this.model.outputs[0].shape);
      
      this.isLoaded = true;
      return this.model;
      
    } catch (error) {
      console.error('Failed to load model:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      this.loadError = error;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  preprocessImage(imageData) {
    console.log('DEBUG Model: Starting preprocessing...');
    console.log('DEBUG Model: Input type:', imageData.constructor.name);
    console.log('DEBUG Model: Input dimensions:', imageData.width, 'x', imageData.height);
    
    // Convert ImageData or canvas to tensor
    let tensor;
    
    if (imageData instanceof ImageData) {
      // Convert ImageData to grayscale tensor
      tensor = tf.browser.fromPixels(imageData, 1);
      console.log('DEBUG Model: Created tensor from ImageData');
    } else if (imageData instanceof HTMLCanvasElement) {
      // Convert canvas to grayscale tensor
      tensor = tf.browser.fromPixels(imageData, 1);
      console.log('DEBUG Model: Created tensor from HTMLCanvasElement');
    } else {
      throw new Error('Unsupported image data type');
    }

    console.log('DEBUG Model: Initial tensor shape:', tensor.shape);
    console.log('DEBUG Model: Initial tensor min/max:', tensor.min().dataSync()[0], tensor.max().dataSync()[0]);

    // Resize to 28x28 if needed
    if (tensor.shape[0] !== 28 || tensor.shape[1] !== 28) {
      console.log('DEBUG Model: Resizing tensor from', tensor.shape, 'to [28, 28]');
      tensor = tf.image.resizeBilinear(tensor, [28, 28]);
    }

    // Normalize to [0, 1] range
    tensor = tensor.div(255.0);
    console.log('DEBUG Model: After normalization min/max:', tensor.min().dataSync()[0], tensor.max().dataSync()[0]);

    // CRITICAL: Invert colors for MNIST format
    // MNIST expects white digits on black background (1 = white, 0 = black)
    // Our canvas has black digits on white background, so we need to invert
    tensor = tf.sub(1.0, tensor);
    console.log('DEBUG Model: After inversion min/max:', tensor.min().dataSync()[0], tensor.max().dataSync()[0]);

    // Add batch dimension: (1, 28, 28, 1)
    tensor = tensor.expandDims(0);

    // Debug: Log tensor statistics
    console.log('DEBUG Model: Final tensor shape:', tensor.shape);
    console.log('DEBUG Model: Final tensor min/max:', tensor.min().dataSync()[0], tensor.max().dataSync()[0]);
    
    // Debug: Sample some pixel values from the tensor
    const sampleData = tensor.squeeze([0]).dataSync();
    console.log('DEBUG Model: First 20 tensor values:', Array.from(sampleData).slice(0, 20));
    console.log('DEBUG Model: Tensor sum:', Array.from(sampleData).reduce((a, b) => a + b, 0));

    return tensor;
  }

  async predict(imageData) {
    if (!this.isLoaded) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    try {
      console.log('DEBUG Model: Starting prediction...');
      
      // Preprocess the image
      const inputTensor = this.preprocessImage(imageData);
      
      // Debug: Show what the model sees
      await this.debugTensor(inputTensor);
      
      // Make prediction
      console.log('DEBUG Model: Running model prediction...');
      const prediction = this.model.predict(inputTensor);
      console.log('DEBUG Model: Prediction tensor shape:', prediction.shape);
      
      // Get probabilities array
      const probabilities = await prediction.data();
      console.log('DEBUG Model: Raw probabilities:', Array.from(probabilities));
      
      // Find predicted class
      const predictedClass = prediction.argMax(-1).dataSync()[0];
      const confidence = Math.max(...probabilities);
      
      console.log('DEBUG Model: Predicted class:', predictedClass);
      console.log('DEBUG Model: Confidence:', confidence);
      console.log('DEBUG Model: All probabilities:', Array.from(probabilities).map((p, i) => `${i}: ${(p * 100).toFixed(2)}%`));
      
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
    // Remove any existing debug tensor visualization
    const existing = document.getElementById('debug-tensor');
    if (existing) existing.remove();
    
    console.log('Debug tensor processing completed (visualization disabled)');
  }
}
