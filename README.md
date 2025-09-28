# Handwritten Digit Recognition

A web-based handwritten digit recognition app using TensorFlow.js and a CNN model trained on MNIST data.

## Setup Instructions

### 1. Model Ready! ✅

The trained model is already included in the `tfjs_model/` directory:
- `model.json` - Model architecture and metadata
- `tfjs_model.weights.bin` - Trained weights

**No training needed!** The model is ready to use.

### 2. Deploy to GitHub Pages

1. Copy the generated `tfjs_model` folder to your repository
2. Ensure your repository contains these files:
   - `index.html`
   - `styles.css`
   - `canvas.js`
   - `model.js`
   - `script.js`
   - `tfjs_model/` (folder with model files)

3. Enable GitHub Pages in your repository settings
4. Your app will be available at `https://yourusername.github.io/repository-name`

### 3. Local Development

To test locally, you need to serve the files through a web server (due to CORS restrictions):

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## File Structure

```
├── index.html          # Main HTML file
├── styles.css          # Styling
├── canvas.js           # Canvas drawing functionality
├── model.js            # TensorFlow.js model loading and prediction
├── script.js           # Main application logic
├── mnist_cnn_training.ipynb  # Model training notebook (optional)
└── tfjs_model/         # TensorFlow.js model files (ready to use!)
    ├── model.json      # Model architecture
    └── tfjs_model.weights.bin  # Model weights
```

## How It Works

1. **Drawing**: Users draw digits on an HTML5 canvas
2. **Preprocessing**: The drawing is converted to a 28×28 grayscale image
3. **Prediction**: The TensorFlow.js model predicts the digit (0-9)
4. **Display**: The predicted digit is shown with confidence scores

## Model Details

- **Architecture**: Lightweight CNN optimized for web deployment
- **Input**: 28×28 grayscale images
- **Output**: 10 classes (digits 0-9)
- **Accuracy**: ~98-99% on MNIST test set
- **Size**: ~400KB (optimized for fast loading)

## Browser Compatibility

- Chrome 58+
- Firefox 57+
- Safari 11+
- Edge 79+

Requires JavaScript and HTML5 Canvas support.

## Troubleshooting

### Model Loading Issues
- Ensure the `tfjs_model` folder is in the same directory as `index.html`
- Check browser console for error messages
- Verify you're serving files through a web server (not file://)

### Prediction Issues
- Make sure to draw clearly in the canvas
- The model works best with digits similar to MNIST style
- Check browser console for detailed error messages

## License

MIT License - feel free to use and modify as needed.
