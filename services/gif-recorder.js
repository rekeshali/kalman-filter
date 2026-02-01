/**
 * GIFRecorder Service
 * Captures DOM element as GIF animation using html2canvas + gif.js
 */

class GIFRecorder {
  constructor() {
    this.isRecording = false;
    this.gif = null;
    this.targetElement = null;
    this.frameRate = 15; // 15 fps (simulation pauses during generation, so performance is fine)
    this.frameDelay = Math.round(1000 / this.frameRate); // ~67ms per frame
    this.startTime = null;

    // Snapshot-based recording (non-blocking)
    this.snapshots = [];  // Array of {timestamp, chartStates}
    this.snapshotInterval = null;
  }

  /**
   * Start recording GIF from target DOM element
   * Uses snapshot-based recording to avoid blocking simulation
   * @param {HTMLElement} element - DOM element to capture
   * @param {Function} getChartStateCallback - Function that returns current chart state
   */
  startRecording(element, getChartStateCallback) {
    if (this.isRecording) {
      console.warn('GIFRecorder: Already recording');
      return false;
    }

    if (!element) {
      console.error('GIFRecorder: No target element provided');
      return false;
    }

    if (!getChartStateCallback) {
      console.error('GIFRecorder: No state callback provided');
      return false;
    }

    this.targetElement = element;
    this.getChartStateCallback = getChartStateCallback;
    this.isRecording = true;
    this.startTime = Date.now();
    this.snapshots = [];

    // Take first snapshot immediately
    this._takeSnapshot();

    // Set up interval to take snapshots (lightweight, non-blocking)
    this.snapshotInterval = setInterval(() => {
      this._takeSnapshot();
    }, this.frameDelay);

    return true;
  }

  /**
   * Take a lightweight snapshot of current chart state
   * Non-blocking operation that just stores data
   * @private
   */
  _takeSnapshot() {
    if (!this.isRecording || !this.getChartStateCallback) {
      return;
    }

    const timestamp = Date.now() - this.startTime;
    const chartState = this.getChartStateCallback();

    this.snapshots.push({
      timestamp,
      chartState
    });
  }

  /**
   * Cancel recording without generating GIF
   */
  cancelRecording() {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }
    this.isRecording = false;
    this.snapshots = [];
    this.targetElement = null;
  }

  /**
   * Render a single frame from chart state
   * Called during offline GIF generation after recording stops
   * @private
   */
  async _renderFrame(chartState) {
    try {
      // Use html2canvas to convert DOM to canvas
      const canvas = await html2canvas(this.targetElement, {
        backgroundColor: '#111827', // bg-gray-900
        scale: 1, // 1:1 scale for performance
        logging: false,
        useCORS: true,
        allowTaint: false,
        windowWidth: 1200, // Force desktop width to trigger md: breakpoint (2-column layout)
        windowHeight: 2400 // Allow enough height for 4 charts
      });

      return canvas;
    } catch (error) {
      console.error('GIFRecorder: Frame render failed:', error);
      return null;
    }
  }

  /**
   * Stop recording and generate GIF from snapshots
   * @param {Function} applyChartStateCallback - Function to apply a chart state to the DOM
   * @returns {Promise<Blob>} GIF blob
   */
  async stopRecording(applyChartStateCallback) {
    if (!this.isRecording) {
      console.warn('GIFRecorder: Not currently recording');
      throw new Error('Not recording');
    }

    // Stop taking snapshots
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }

    this.isRecording = false;
    const snapshotCount = this.snapshots.length;

    if (snapshotCount === 0) {
      throw new Error('No snapshots recorded');
    }

    // Initialize GIF encoder
    this.gif = new GIF({
      workers: 2,
      quality: 10, // 1-30, lower is better quality
      width: this.targetElement.offsetWidth,
      height: this.targetElement.offsetHeight,
      workerScript: './services/gif.worker.js'
    });

    // Render each snapshot as a frame
    for (let i = 0; i < this.snapshots.length; i++) {
      const snapshot = this.snapshots[i];

      // Apply chart state to DOM
      if (applyChartStateCallback) {
        applyChartStateCallback(snapshot.chartState);
      }

      // Wait a tick for DOM to update
      await new Promise(resolve => setTimeout(resolve, 10));

      // Capture frame
      const canvas = await this._renderFrame(snapshot.chartState);
      if (canvas) {
        this.gif.addFrame(canvas, {
          delay: this.frameDelay,
          copy: true
        });
      }
    }

    // Encode GIF
    return new Promise((resolve, reject) => {
      this.gif.on('finished', (blob) => {
        this.gif = null;
        this.targetElement = null;
        this.snapshots = [];
        resolve(blob);
      });

      this.gif.render();
    });
  }

  /**
   * Download GIF file with timestamp
   * @param {Blob} blob - GIF blob
   * @param {string} timestamp - ISO timestamp string
   */
  downloadGIF(blob, timestamp) {
    const filename = `ekf-recording-${timestamp}.gif`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Check if currently recording
   * @returns {boolean}
   */
  getIsRecording() {
    return this.isRecording;
  }
}

// Export to global scope
window.GIFRecorder = GIFRecorder;
