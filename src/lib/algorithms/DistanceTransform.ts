/**
 * Computes distance transform from contact line
 */

import type { ContactLine, DistanceMap } from '../core/types';
import { distance } from '../utils/math';

/**
 * DistanceTransform - Calculate distance from each pixel to contact line
 *
 * Algorithm:
 * - For each pixel in the silhouette mask
 * - Calculate Euclidean distance to nearest contact line point
 * - Store in Float32Array distance map
 *
 * Purpose:
 * - Distance determines opacity falloff (near = dark, far = fade)
 * - Distance determines blur radius (near = sharp, far = blurry)
 *
 * Complexity: O(n * m) where n = pixels, m = contact points
 * Could optimize with 2-pass algorithm, but clarity is prioritized
 */
export class DistanceTransform {
  /**
   * Compute distance transform from contact line
   *
   * @param mask - Binary silhouette mask (1 = compute distance, 0 = skip)
   * @param contactLine - Contact line points
   * @param width - Image width
   * @param height - Image height
   * @returns DistanceMap with distance from contact line for each pixel
   */
  compute(
    mask: Uint8Array,
    contactLine: ContactLine,
    width: number,
    height: number
  ): DistanceMap {
    // Initialize distance map with zeros
    const distances = new Float32Array(width * height);

    // If no contact points, all distances are 0
    if (contactLine.points.length === 0) {
      return { data: distances, width, height };
    }

    // For each pixel in the image
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        // Skip transparent pixels (not part of silhouette)
        if (mask[idx] === 0) {
          distances[idx] = 0;
          continue;
        }

        // Find minimum distance to any contact line point
        let minDist = Infinity;

        for (const point of contactLine.points) {
          // Calculate Euclidean distance from (x, y) to contact point
          const dist = distance(x, y, point.x, point.y);
          minDist = Math.min(minDist, dist);
        }

        // Store distance for this pixel
        distances[idx] = minDist;
      }
    }

    return { data: distances, width, height };
  }

  /**
   * Visualize distance map for debugging
   * Maps distances to grayscale (near = dark, far = bright)
   *
   * @param distanceMap - Distance map to visualize
   * @param maxDistance - Maximum distance for normalization
   * @returns ImageData with distance visualization
   */
  visualizeDistanceMap(
    distanceMap: DistanceMap,
    maxDistance: number
  ): ImageData {
    const imageData = new ImageData(distanceMap.width, distanceMap.height);
    const pixels = imageData.data;

    for (let i = 0; i < distanceMap.data.length; i++) {
      const dist = distanceMap.data[i];

      // Normalize distance to 0-255 range
      const normalized = Math.min(dist / maxDistance, 1.0);
      const value = Math.round(normalized * 255);

      const pixelIdx = i * 4;
      pixels[pixelIdx] = value;     // R
      pixels[pixelIdx + 1] = value; // G
      pixels[pixelIdx + 2] = value; // B
      pixels[pixelIdx + 3] = 255;   // A
    }

    return imageData;
  }

  /**
   * Get statistics about the distance map
   * (useful for tuning shadow parameters)
   *
   * @param distanceMap - Distance map
   * @param mask - Silhouette mask (to only consider foreground pixels)
   * @returns Statistics { min, max, average }
   */
  getStatistics(
    distanceMap: DistanceMap,
    mask: Uint8Array
  ): { min: number; max: number; average: number } {
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let count = 0;

    for (let i = 0; i < distanceMap.data.length; i++) {
      // Only consider pixels in the silhouette
      if (mask[i] === 0) continue;

      const dist = distanceMap.data[i];
      min = Math.min(min, dist);
      max = Math.max(max, dist);
      sum += dist;
      count++;
    }

    const average = count > 0 ? sum / count : 0;

    return {
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max,
      average
    };
  }
}
