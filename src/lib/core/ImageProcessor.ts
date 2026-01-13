/**
 * Image loading and pixel buffer handling
 */

/**
 * ImageProcessor - Load images and convert to ImageData
 *
 * Handles:
 * - Loading images from File or URL
 * - Converting to ImageData pixel buffers
 * - Resizing/scaling if needed
 */
export class ImageProcessor {
  /**
   * Load image from File object and convert to ImageData
   *
   * @param file - Image file (from file input)
   * @returns Promise resolving to ImageData
   */
  async loadFromFile(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      // Use Object URL instead of Data URL (faster, no base64 encoding)
      const url = URL.createObjectURL(file);

      this.loadFromUrl(url)
        .then((imageData) => {
          URL.revokeObjectURL(url);  // Clean up memory
          resolve(imageData);
        })
        .catch((error) => {
          URL.revokeObjectURL(url);  // Clean up on error too
          reject(error);
        });
    });
  }

  /**
   * Load image from URL and convert to ImageData
   *
   * @param url - Image URL (can be data URL or http URL)
   * @returns Promise resolving to ImageData
   */
  async loadFromUrl(url: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const loadStartTime = performance.now();

      img.onload = () => {
        const imageLoadTime = performance.now() - loadStartTime;
        console.log(`  → Image decode time: ${(imageLoadTime / 1000).toFixed(2)}s (${img.width}x${img.height})`);

        try {
          const processStart = performance.now();
          const imageData = this.imageToImageData(img);
          const processTime = performance.now() - processStart;
          console.log(`  → Image processing time: ${(processTime / 1000).toFixed(2)}s`);
          resolve(imageData);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      // Set crossOrigin for external URLs
      if (url.startsWith('http')) {
        img.crossOrigin = 'anonymous';
      }

      console.log(`  → Starting image decode...`);
      img.src = url;
    });
  }

  /**
   * Convert HTMLImageElement to ImageData
   *
   * @param img - Loaded image element
   * @returns ImageData pixel buffer
   */
  imageToImageData(img: HTMLImageElement): ImageData {
    // Maximum dimension limit for performance
    const MAX_DIMENSION = 1200;

    let width = img.width;
    let height = img.height;

    // Downscale if image is too large (maintains aspect ratio)
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      console.log(`Image downscaled from ${img.width}x${img.height} to ${width}x${height}`);
    }

    // Create off-screen canvas at target dimensions
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }

    // Draw image (scaled if needed)
    ctx.drawImage(img, 0, 0, width, height);

    // Extract pixel data
    return ctx.getImageData(0, 0, width, height);
  }

  /**
   * Resize ImageData to target dimensions
   *
   * @param imageData - Source ImageData
   * @param targetWidth - Target width
   * @param targetHeight - Target height
   * @returns Resized ImageData
   */
  resize(
    imageData: ImageData,
    targetWidth: number,
    targetHeight: number
  ): ImageData {
    // Create canvas with source dimensions
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = imageData.width;
    srcCanvas.height = imageData.height;

    const srcCtx = srcCanvas.getContext('2d');
    if (!srcCtx) {
      throw new Error('Failed to get canvas 2D context');
    }

    // Put source image data
    srcCtx.putImageData(imageData, 0, 0);

    // Create canvas with target dimensions
    const dstCanvas = document.createElement('canvas');
    dstCanvas.width = targetWidth;
    dstCanvas.height = targetHeight;

    const dstCtx = dstCanvas.getContext('2d');
    if (!dstCtx) {
      throw new Error('Failed to get canvas 2D context');
    }

    // Draw resized image
    dstCtx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);

    // Extract resized pixel data
    return dstCtx.getImageData(0, 0, targetWidth, targetHeight);
  }

  /**
   * Ensure all images have the same dimensions
   * Resizes to the size of the first image
   *
   * @param images - Array of ImageData objects
   * @returns Array of resized ImageData (all same size)
   */
  ensureSameDimensions(images: ImageData[]): ImageData[] {
    if (images.length === 0) return [];

    const targetWidth = images[0].width;
    const targetHeight = images[0].height;

    return images.map((img) => {
      if (img.width === targetWidth && img.height === targetHeight) {
        return img;
      }
      return this.resize(img, targetWidth, targetHeight);
    });
  }

  /**
   * Convert ImageData to downloadable Blob
   *
   * @param imageData - ImageData to convert
   * @param mimeType - Output format (default: image/png)
   * @returns Promise resolving to Blob
   */
  async imageDataToBlob(
    imageData: ImageData,
    mimeType: string = 'image/png'
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas 2D context'));
        return;
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        mimeType
      );
    });
  }

  /**
   * Trigger download of ImageData as PNG file
   *
   * @param imageData - ImageData to download
   * @param filename - Download filename
   */
  async downloadImageData(
    imageData: ImageData,
    filename: string
  ): Promise<void> {
    const blob = await this.imageDataToBlob(imageData);
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    // Clean up
    URL.revokeObjectURL(url);
  }
}
