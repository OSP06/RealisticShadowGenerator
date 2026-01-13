/**
 * Projects shadow based on light vector using Bresenham's line algorithm
 */

import type { LightVector } from '../core/types';

/**
 * ShadowProjector - Geometric shadow projection
 *
 * Algorithm:
 * 1. For each opaque pixel in silhouette
 * 2. Calculate projection point based on light vector
 * 3. Draw line from pixel to projection using Bresenham's algorithm
 * 4. If depth map provided, warp projection based on depth
 *
 * Shadow Direction:
 * - Shadow projects in OPPOSITE direction of light vector
 * - If light comes from right (dx > 0), shadow goes left
 */
export class ShadowProjector {
  /**
   * Project shadow from silhouette based on light vector
   *
   * @param mask - Binary silhouette mask (1 = opaque, 0 = transparent)
   * @param width - Image width
   * @param height - Image height
   * @param lightVector - Light direction vector
   * @param maxDistance - Maximum shadow projection distance
   * @param depthMap - Optional depth map for depth-aware warping
   * @returns Shadow mask (1 = shadow, 0 = no shadow)
   */
  project(
    mask: Uint8Array,
    width: number,
    height: number,
    lightVector: LightVector,
    maxDistance: number,
    depthMap?: ImageData
  ): Uint8Array {
    // Create shadow mask
    const shadowMask = new Uint8Array(width * height);

    // For each pixel in the silhouette
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        // Skip transparent pixels
        if (mask[idx] === 0) continue;

        // Get depth warp factor if depth map provided
        let warpFactor = 1.0;

        if (depthMap) {
          const depthIdx = idx * 4;
          // Grayscale depth: 0 (near) to 255 (far)
          const depth = depthMap.data[depthIdx] / 255.0;

          // Objects further back cast longer/more warped shadows
          // warp = 1.0 + depth * 0.5
          // depth = 0 (near) → warp = 1.0
          // depth = 1 (far) → warp = 1.5
          warpFactor = 1.0 + depth * 0.5;
        }

        // Calculate shadow projection endpoint
        // Shadow goes in OPPOSITE direction of light
        // Negative sign because shadow is cast away from light source
        const projX = x - lightVector.dx * maxDistance * warpFactor;
        const projY = y - lightVector.dy * maxDistance * warpFactor;

        // Cast shadow from (x, y) to (projX, projY) using Bresenham
        this.drawLine(shadowMask, width, height, x, y, projX, projY);
      }
    }

    return shadowMask;
  }

  /**
   * Bresenham's line algorithm for shadow casting
   * Draws a line from (x0, y0) to (x1, y1) in the shadow mask
   *
   * @param buffer - Shadow mask buffer
   * @param width - Image width
   * @param height - Image height
   * @param x0 - Start X
   * @param y0 - Start Y
   * @param x1 - End X
   * @param y1 - End Y
   */
  private drawLine(
    buffer: Uint8Array,
    width: number,
    height: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): void {
    // Bresenham's line algorithm
    // https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);

    // Direction of line
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;

    let err = dx - dy;

    // Current position (round to integer)
    let x = Math.round(x0);
    let y = Math.round(y0);

    // End position (round to integer)
    const endX = Math.round(x1);
    const endY = Math.round(y1);

    // Trace line from start to end
    while (true) {
      // Mark pixel as shadow (if within bounds)
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = y * width + x;
        buffer[idx] = 1;
      }

      // Reached end point
      if (x === endX && y === endY) break;

      // Calculate error for next step
      const e2 = 2 * err;

      // Step in X direction
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }

      // Step in Y direction
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /**
   * Combine silhouette mask with shadow mask
   * Removes shadow pixels that are occluded by the foreground
   *
   * @param shadowMask - Shadow mask
   * @param silhouetteMask - Silhouette mask
   * @param width - Image width
   * @param height - Image height
   * @returns Shadow mask with occlusions removed
   */
  removeOcclusions(
    shadowMask: Uint8Array,
    silhouetteMask: Uint8Array,
    width: number,
    height: number
  ): Uint8Array {
    const result = new Uint8Array(width * height);

    for (let i = 0; i < shadowMask.length; i++) {
      // Only keep shadow pixels that are NOT occluded by silhouette
      if (shadowMask[i] === 1 && silhouetteMask[i] === 0) {
        result[i] = 1;
      }
    }

    return result;
  }
}
