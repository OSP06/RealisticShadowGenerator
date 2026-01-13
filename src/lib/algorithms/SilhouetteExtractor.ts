/**
 * Extracts binary silhouette mask from image alpha channel
 */

/**
 * SilhouetteExtractor - Converts alpha channel to binary mask
 *
 * Algorithm:
 * - For each pixel, check alpha channel value
 * - If alpha > threshold → mark as 1 (opaque/foreground)
 * - If alpha ≤ threshold → mark as 0 (transparent/background)
 */
export class SilhouetteExtractor {
  /**
   * Extract binary silhouette from ImageData alpha channel
   *
   * @param imageData - Image with alpha channel
   * @param alphaThreshold - Threshold for considering pixel opaque (0-255)
   * @returns Binary mask as Uint8Array (1 = opaque, 0 = transparent)
   */
  extract(imageData: ImageData, alphaThreshold: number = 10): Uint8Array {
    const width = imageData.width;
    const height = imageData.height;
    const pixels = imageData.data;

    // Create binary mask buffer
    const mask = new Uint8Array(width * height);

    let opaquePixels = 0;
    let transparentPixels = 0;

    // Per-pixel loop: extract silhouette from alpha channel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate pixel index in RGBA buffer
        // ImageData stores as [R, G, B, A, R, G, B, A, ...]
        const pixelIdx = (y * width + x) * 4;

        // Get alpha value (4th component)
        const alpha = pixels[pixelIdx + 3];

        // Binary threshold: alpha > threshold → 1, else → 0
        const maskIdx = y * width + x;
        mask[maskIdx] = alpha > alphaThreshold ? 1 : 0;

        if (mask[maskIdx] === 1) {
          opaquePixels++;
        } else {
          transparentPixels++;
        }
      }
    }

    const totalPixels = width * height;
    const opaquePercent = ((opaquePixels / totalPixels) * 100).toFixed(1);
    console.log(`   Silhouette: ${opaquePixels.toLocaleString()} opaque (${opaquePercent}%), ${transparentPixels.toLocaleString()} transparent`);

    if (opaquePixels === totalPixels) {
      console.warn('   ⚠️  WARNING: Entire image is opaque! Foreground image must have transparent background (PNG with alpha channel)');
    }

    return mask;
  }

  /**
   * Convert binary mask to ImageData for visualization
   * (useful for debug output)
   *
   * @param mask - Binary mask
   * @param width - Image width
   * @param height - Image height
   * @returns ImageData with white pixels for 1, black for 0
   */
  maskToImageData(mask: Uint8Array, width: number, height: number): ImageData {
    const imageData = new ImageData(width, height);
    const pixels = imageData.data;

    for (let i = 0; i < mask.length; i++) {
      const pixelIdx = i * 4;
      const value = mask[i] * 255; // 0 → 0 (black), 1 → 255 (white)

      pixels[pixelIdx] = value;     // R
      pixels[pixelIdx + 1] = value; // G
      pixels[pixelIdx + 2] = value; // B
      pixels[pixelIdx + 3] = 255;   // A (fully opaque)
    }

    return imageData;
  }
}
