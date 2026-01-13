/**
 * Demo application for Realistic Shadow Generator
 */

import { ShadowGenerator } from '../lib/core/ShadowGenerator';
import { ImageProcessor } from '../lib/core/ImageProcessor';
import type { ImageSet, ShadowConfig } from '../lib/core/types';

class DemoApp {
  private generator: ShadowGenerator;
  private imageProcessor: ImageProcessor;

  // Loaded images
  private foregroundData: ImageData | null = null;
  private backgroundData: ImageData | null = null;
  private depthMapData: ImageData | null = null;

  // UI elements
  private foregroundInput: HTMLInputElement;
  private backgroundInput: HTMLInputElement;
  private depthMapInput: HTMLInputElement;
  private lightAngleSlider: HTMLInputElement;
  private lightElevationSlider: HTMLInputElement;
  private angleValueDisplay: HTMLElement;
  private elevationValueDisplay: HTMLElement;
  private generateBtn: HTMLButtonElement;
  private statusDiv: HTMLElement;
  private outputsContainer: HTMLElement;
  private shadowCanvas: HTMLCanvasElement;
  private maskCanvas: HTMLCanvasElement;
  private compositeCanvas: HTMLCanvasElement;
  private foregroundPreview: HTMLCanvasElement;
  private backgroundPreview: HTMLCanvasElement;
  private depthmapPreview: HTMLCanvasElement;

  constructor() {
    // Initialize library components
    this.generator = new ShadowGenerator();
    this.imageProcessor = new ImageProcessor();

    // Get UI elements
    this.foregroundInput = document.getElementById('foreground') as HTMLInputElement;
    this.backgroundInput = document.getElementById('background') as HTMLInputElement;
    this.depthMapInput = document.getElementById('depthmap') as HTMLInputElement;
    this.lightAngleSlider = document.getElementById('lightAngle') as HTMLInputElement;
    this.lightElevationSlider = document.getElementById('lightElevation') as HTMLInputElement;
    this.angleValueDisplay = document.getElementById('angleValue') as HTMLElement;
    this.elevationValueDisplay = document.getElementById('elevationValue') as HTMLElement;
    this.generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
    this.statusDiv = document.getElementById('status') as HTMLElement;
    this.outputsContainer = document.getElementById('outputsContainer') as HTMLElement;
    this.shadowCanvas = document.getElementById('shadowCanvas') as HTMLCanvasElement;
    this.maskCanvas = document.getElementById('maskCanvas') as HTMLCanvasElement;
    this.compositeCanvas = document.getElementById('compositeCanvas') as HTMLCanvasElement;
    this.foregroundPreview = document.getElementById('foregroundPreview') as HTMLCanvasElement;
    this.backgroundPreview = document.getElementById('backgroundPreview') as HTMLCanvasElement;
    this.depthmapPreview = document.getElementById('depthmapPreview') as HTMLCanvasElement;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Image upload handlers
    this.foregroundInput.addEventListener('change', () => this.handleImageUpload('foreground'));
    this.backgroundInput.addEventListener('change', () => this.handleImageUpload('background'));
    this.depthMapInput.addEventListener('change', () => this.handleImageUpload('depthmap'));

    // Parameter slider handlers
    this.lightAngleSlider.addEventListener('input', () => {
      this.angleValueDisplay.textContent = `${this.lightAngleSlider.value}°`;
    });

    this.lightElevationSlider.addEventListener('input', () => {
      this.elevationValueDisplay.textContent = `${this.lightElevationSlider.value}°`;
    });

    // Generate button
    this.generateBtn.addEventListener('click', () => this.generateShadow());

    // Download buttons
    document.querySelectorAll('.download-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const canvasId = target.dataset.canvas;
        const filename = target.dataset.filename;
        if (canvasId && filename) {
          this.downloadCanvas(canvasId, filename);
        }
      });
    });
  }

  private async handleImageUpload(type: 'foreground' | 'background' | 'depthmap'): Promise<void> {
    let input: HTMLInputElement;
    let previewCanvas: HTMLCanvasElement;

    switch (type) {
      case 'foreground':
        input = this.foregroundInput;
        previewCanvas = this.foregroundPreview;
        break;
      case 'background':
        input = this.backgroundInput;
        previewCanvas = this.backgroundPreview;
        break;
      case 'depthmap':
        input = this.depthMapInput;
        previewCanvas = this.depthmapPreview;
        break;
    }

    const file = input.files?.[0];
    if (!file) return;

    try {
      const startTotal = performance.now();

      // Show file size for user feedback
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      this.showStatus(`Loading ${type} (${fileSizeMB}MB)...`, 'info');

      console.log(`[${type}] Starting load - File size: ${fileSizeMB}MB`);

      const loadStart = performance.now();
      const imageData = await this.imageProcessor.loadFromFile(file);
      const loadEnd = performance.now();

      console.log(`[${type}] Load completed in ${((loadEnd - loadStart) / 1000).toFixed(2)}s - Dimensions: ${imageData.width}x${imageData.height}`);

      switch (type) {
        case 'foreground':
          this.foregroundData = imageData;
          break;
        case 'background':
          this.backgroundData = imageData;
          break;
        case 'depthmap':
          this.depthMapData = imageData;
          break;
      }

      // Display preview
      const displayStart = performance.now();
      this.displayImageData(previewCanvas, imageData);
      const displayEnd = performance.now();

      console.log(`[${type}] Preview rendered in ${((displayEnd - displayStart) / 1000).toFixed(2)}s`);

      const endTotal = performance.now();
      const totalTime = ((endTotal - startTotal) / 1000).toFixed(2);

      console.log(`[${type}] Total upload time: ${totalTime}s`);

      this.showStatus(`${type} loaded: ${imageData.width}x${imageData.height} (${totalTime}s)`, 'success');
      this.updateGenerateButton();
    } catch (error) {
      this.showStatus(`Failed to load ${type}: ${error}`, 'error');
    }
  }

  private updateGenerateButton(): void {
    // Enable generate button only if foreground and background are loaded
    const canGenerate = this.foregroundData !== null && this.backgroundData !== null;
    this.generateBtn.disabled = !canGenerate;
  }

  private async generateShadow(): Promise<void> {
    if (!this.foregroundData || !this.backgroundData) {
      this.showStatus('Please load foreground and background images', 'error');
      return;
    }

    try {
      this.generateBtn.disabled = true;
      this.showStatus('Generating shadow...', 'info');

      // Ensure images have same dimensions
      const images = this.imageProcessor.ensureSameDimensions([
        this.foregroundData,
        this.backgroundData,
        ...(this.depthMapData ? [this.depthMapData] : [])
      ]);

      const imageSet: ImageSet = {
        foreground: images[0],
        background: images[1],
        depthMap: images[2]
      };

      // Get configuration from sliders
      const config: ShadowConfig = {
        lightAngle: parseInt(this.lightAngleSlider.value),
        lightElevation: parseInt(this.lightElevationSlider.value),
        maxShadowDistance: 150,
        contactOpacity: 0.8,
        falloffRate: 4,
        minBlurRadius: 1,
        maxBlurRadius: 10
      };

      // Generate shadow
      const startTime = performance.now();
      const result = this.generator.generate(imageSet, config);
      const endTime = performance.now();

      // Display results
      this.displayImageData(this.shadowCanvas, result.shadowOnly);
      this.displayImageData(this.maskCanvas, result.maskDebug);
      this.displayImageData(this.compositeCanvas, result.composite);

      // Show outputs
      this.outputsContainer.classList.remove('hidden');

      const duration = ((endTime - startTime) / 1000).toFixed(2);
      this.showStatus(`Shadow generated successfully in ${duration}s`, 'success');
    } catch (error) {
      this.showStatus(`Generation failed: ${error}`, 'error');
      console.error(error);
    } finally {
      this.generateBtn.disabled = false;
    }
  }

  private displayImageData(canvas: HTMLCanvasElement, imageData: ImageData): void {
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private async downloadCanvas(canvasId: string, filename: string): Promise<void> {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    try {
      // Get ImageData from canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Download using ImageProcessor
      await this.imageProcessor.downloadImageData(imageData, filename);

      this.showStatus(`Downloaded ${filename}`, 'success');
    } catch (error) {
      this.showStatus(`Download failed: ${error}`, 'error');
    }
  }

  private showStatus(message: string, type: 'info' | 'success' | 'error'): void {
    this.statusDiv.textContent = message;
    this.statusDiv.className = `status ${type}`;
    this.statusDiv.classList.remove('hidden');

    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
      setTimeout(() => {
        this.statusDiv.classList.add('hidden');
      }, 5000);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new DemoApp();
  console.log('🎬 Realistic Shadow Generator Demo initialized');
});
