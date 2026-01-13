/**
 * Detects contact line (lowest visible silhouette pixels)
 */

import type { ContactLine } from '../core/types';

/**
 * ContactLineDetector - Finds the "ground contact" points of the silhouette
 *
 * Algorithm:
 * - For each column (x), scan from bottom to top
 * - Find the lowest opaque pixel (highest y coordinate)
 * - These points form the contact line where shadow should be sharpest
 *
 * Assumption: Ground plane is roughly aligned with image bottom
 */
export class ContactLineDetector {
  /**
   * Detect contact line from binary silhouette mask
   *
   * @param mask - Binary silhouette mask (1 = opaque, 0 = transparent)
   * @param width - Image width
   * @param height - Image height
   * @returns ContactLine with array of contact points
   */
  detect(mask: Uint8Array, width: number, height: number): ContactLine {
    const points: Array<{ x: number; y: number }> = [];

    // For each column, find the lowest opaque pixel
    for (let x = 0; x < width; x++) {
      let lowestY = -1;

      // Scan from bottom to top (high y to low y)
      for (let y = height - 1; y >= 0; y--) {
        const idx = y * width + x;

        // Check if pixel is opaque
        if (mask[idx] === 1) {
          // Found the lowest visible pixel in this column
          lowestY = y;
          break; // Stop scanning this column
        }
      }

      // If we found an opaque pixel in this column, add it to contact line
      if (lowestY >= 0) {
        points.push({ x, y: lowestY });
      }
    }

    return { points };
  }

  /**
   * Visualize contact line for debugging
   * Returns ImageData with contact line marked in red
   *
   * @param mask - Binary silhouette mask
   * @param contactLine - Contact line to visualize
   * @param width - Image width
   * @param height - Image height
   * @returns ImageData with contact line visualization
   */
  visualizeContactLine(
    mask: Uint8Array,
    contactLine: ContactLine,
    width: number,
    height: number
  ): ImageData {
    const imageData = new ImageData(width, height);
    const pixels = imageData.data;

    // First, render the mask in grayscale
    for (let i = 0; i < mask.length; i++) {
      const pixelIdx = i * 4;
      const value = mask[i] * 128; // Dim gray for mask

      pixels[pixelIdx] = value;     // R
      pixels[pixelIdx + 1] = value; // G
      pixels[pixelIdx + 2] = value; // B
      pixels[pixelIdx + 3] = 255;   // A
    }

    // Then, mark contact points in red
    for (const point of contactLine.points) {
      const pixelIdx = (point.y * width + point.x) * 4;

      pixels[pixelIdx] = 255;     // R (red)
      pixels[pixelIdx + 1] = 0;   // G
      pixels[pixelIdx + 2] = 0;   // B
      pixels[pixelIdx + 3] = 255; // A
    }

    return imageData;
  }

  /**
   * Get bounding box of contact line
   * (useful for optimizing shadow projection)
   *
   * @param contactLine - Contact line
   * @returns Bounding box { minX, maxX, minY, maxY }
   */
  getContactLineBounds(contactLine: ContactLine): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    if (contactLine.points.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const point of contactLine.points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    return { minX, maxX, minY, maxY };
  }
}
