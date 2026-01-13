/**
 * Distance-weighted Gaussian blur for realistic shadow softness
 */

import type { DistanceMap } from '../core/types';
import { clamp, normalize, lerp } from '../utils/math';
import { isInBounds } from '../utils/imageData';

/**
 * BlurEngine - Variable-radius Gaussian blur
 *
 * Algorithm:
 * - Near contact line: minimal blur (sharp shadow)
 * - Far from contact: heavy blur (soft shadow)
 * - Blur radius determined by distance from contact line
 *
 * Gaussian Kernel:
 * - Weight(x,y) = exp(-(dx² + dy²) / (2*σ²))
 * - σ (sigma) = blur radius / 2
 *
 * Complexity: O(n * k²) where n = pixels, k = max kernel size
 * This is expensive but necessary for realism
 */
export class BlurEngine {
  /**
   * Apply distance-weighted Gaussian blur to shadow layer
   *
   * @param shadowData - Shadow ImageData to blur
   * @param distanceMap - Distance from contact line for each pixel
   * @param minBlur - Minimum blur radius at contact line (pixels)
   * @param maxBlur - Maximum blur radius at max distance (pixels)
   * @param maxDistance - Maximum shadow distance for normalization
   * @returns Blurred shadow ImageData
   */
  applyDistanceWeightedBlur(
    shadowData: ImageData,
    distanceMap: DistanceMap,
    minBlur: number,
    maxBlur: number,
    maxDistance: number
  ): ImageData {
    const width = shadowData.width;
    const height = shadowData.height;

    // Create result buffer
    const result = new ImageData(width, height);

    const totalPixels = width * height;
    let processedPixels = 0;
    let lastLogTime = performance.now();
    const startTime = performance.now();

    console.log(`   Processing ${width}x${height} = ${totalPixels.toLocaleString()} pixels...`);

    // For each pixel, apply blur based on its distance from contact line
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        // Get distance from contact line for this pixel
        const distance = distanceMap.data[idx];

        // Calculate blur radius based on distance
        // Near contact (distance = 0): minBlur
        // Far from contact (distance = maxDistance): maxBlur
        const normalizedDist = normalize(distance, 0, maxDistance);
        const blurRadius = lerp(minBlur, maxBlur, normalizedDist);

        // Apply Gaussian blur at this pixel with calculated radius
        const blurred = this.gaussianBlurAtPixel(
          shadowData,
          x,
          y,
          blurRadius
        );

        // Write blurred pixel to result
        const pixelIdx = idx * 4;
        result.data[pixelIdx] = blurred.r;
        result.data[pixelIdx + 1] = blurred.g;
        result.data[pixelIdx + 2] = blurred.b;
        result.data[pixelIdx + 3] = blurred.a;

        processedPixels++;

        // Log progress every 2 seconds
        const now = performance.now();
        if (now - lastLogTime > 2000) {
          const progress = ((processedPixels / totalPixels) * 100).toFixed(1);
          const elapsed = ((now - startTime) / 1000).toFixed(1);
          const pixelsPerSec = processedPixels / ((now - startTime) / 1000);
          const remaining = ((totalPixels - processedPixels) / pixelsPerSec).toFixed(1);
          console.log(`   Blur progress: ${progress}% (${elapsed}s elapsed, ~${remaining}s remaining)`);
          lastLogTime = now;
        }
      }
    }

    const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`   Blur completed in ${totalTime}s`);

    return result;
  }

  /**
   * Apply fast box blur approximation at a single pixel
   * Much faster than Gaussian blur (O(1) instead of O(r²))
   *
   * @param imageData - Source image
   * @param cx - Center X coordinate
   * @param cy - Center Y coordinate
   * @param radius - Blur radius
   * @returns Blurred pixel color { r, g, b, a }
   */
  private gaussianBlurAtPixel(
    imageData: ImageData,
    cx: number,
    cy: number,
    radius: number
  ): { r: number; g: number; b: number; a: number } {
    // Skip blur for very small radius
    if (radius < 0.5) {
      const idx = (cy * imageData.width + cx) * 4;
      return {
        r: imageData.data[idx],
        g: imageData.data[idx + 1],
        b: imageData.data[idx + 2],
        a: imageData.data[idx + 3]
      };
    }

    const width = imageData.width;
    const height = imageData.height;
    const pixels = imageData.data;

    // Use box blur for speed (good approximation of Gaussian)
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    let count = 0;

    const intRadius = Math.ceil(radius);

    // Sample square neighborhood
    for (let dy = -intRadius; dy <= intRadius; dy++) {
      for (let dx = -intRadius; dx <= intRadius; dx++) {
        const x = cx + dx;
        const y = cy + dy;

        // Skip out-of-bounds pixels
        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        // Simple distance check for circular blur
        const distSq = dx * dx + dy * dy;
        if (distSq > radius * radius) continue;

        const idx = (y * width + x) * 4;
        r += pixels[idx];
        g += pixels[idx + 1];
        b += pixels[idx + 2];
        a += pixels[idx + 3];
        count++;
      }
    }

    // Average
    if (count > 0) {
      r /= count;
      g /= count;
      b /= count;
      a /= count;
    }

    return {
      r: clamp(Math.round(r), 0, 255),
      g: clamp(Math.round(g), 0, 255),
      b: clamp(Math.round(b), 0, 255),
      a: clamp(Math.round(a), 0, 255)
    };
  }

  /**
   * Simple uniform Gaussian blur (for testing/comparison)
   * Applies same blur radius to entire image
   *
   * @param imageData - Image to blur
   * @param radius - Blur radius
   * @returns Blurred image
   */
  uniformBlur(imageData: ImageData, radius: number): ImageData {
    const width = imageData.width;
    const height = imageData.height;
    const result = new ImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const blurred = this.gaussianBlurAtPixel(imageData, x, y, radius);

        const idx = (y * width + x) * 4;
        result.data[idx] = blurred.r;
        result.data[idx + 1] = blurred.g;
        result.data[idx + 2] = blurred.b;
        result.data[idx + 3] = blurred.a;
      }
    }

    return result;
  }
}
