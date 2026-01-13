/**
 * Composes shadow with opacity falloff and alpha blending
 */

import type { ShadowConfig, DistanceMap } from '../core/types';
import { exponentialFalloff } from '../utils/math';
import { alphaBlend } from '../utils/imageData';

/**
 * ShadowCompositor - Create shadow layer and composite images
 *
 * Responsibilities:
 * 1. Apply opacity falloff based on distance from contact line
 * 2. Create shadow-only layer (transparent PNG with black shadow)
 * 3. Composite background + shadow + foreground using alpha blending
 */
export class ShadowCompositor {
  /**
   * Create shadow layer with distance-based opacity falloff
   *
   * @param shadowMask - Binary shadow mask (1 = shadow, 0 = no shadow)
   * @param distanceMap - Distance from contact line for each pixel
   * @param config - Shadow configuration (opacity, falloff rate, etc.)
   * @param width - Image width
   * @param height - Image height
   * @returns ImageData with shadow layer (black shadow with alpha)
   */
  createShadowLayer(
    shadowMask: Uint8Array,
    distanceMap: DistanceMap,
    config: ShadowConfig,
    width: number,
    height: number
  ): ImageData {
    const shadowData = new ImageData(width, height);
    const pixels = shadowData.data;

    // For each pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        // Skip if no shadow at this pixel
        if (shadowMask[idx] === 0) {
          // Transparent pixel
          const pixelIdx = idx * 4;
          pixels[pixelIdx] = 0;     // R
          pixels[pixelIdx + 1] = 0; // G
          pixels[pixelIdx + 2] = 0; // B
          pixels[pixelIdx + 3] = 0; // A (transparent)
          continue;
        }

        // Get distance from contact line
        const distance = distanceMap.data[idx];

        // Calculate opacity based on distance
        // Near contact: high opacity (dark shadow)
        // Far from contact: low opacity (faded shadow)
        const opacity = exponentialFalloff(
          distance,
          config.contactOpacity,
          config.falloffRate,
          config.maxShadowDistance
        );

        // Shadow color: black (0, 0, 0) with calculated alpha
        const pixelIdx = idx * 4;
        pixels[pixelIdx] = 0;                      // R (black)
        pixels[pixelIdx + 1] = 0;                  // G (black)
        pixels[pixelIdx + 2] = 0;                  // B (black)
        pixels[pixelIdx + 3] = opacity * 255;      // A (opacity)
      }
    }

    return shadowData;
  }

  /**
   * Composite final image: background + shadow + foreground
   *
   * Layer order (bottom to top):
   * 1. Background (opaque)
   * 2. Shadow (transparent with alpha)
   * 3. Foreground (transparent with alpha)
   *
   * Uses Porter-Duff "over" alpha blending
   *
   * @param background - Background image
   * @param shadow - Shadow layer (with alpha)
   * @param foreground - Foreground cutout (with alpha)
   * @returns Final composite ImageData
   */
  composite(
    background: ImageData,
    shadow: ImageData,
    foreground: ImageData
  ): ImageData {
    const width = background.width;
    const height = background.height;

    // Create result buffer
    const result = new ImageData(width, height);

    // Per-pixel compositing
    for (let i = 0; i < width * height; i++) {
      const pixelIdx = i * 4;

      // Start with background (opaque)
      let r = background.data[pixelIdx];
      let g = background.data[pixelIdx + 1];
      let b = background.data[pixelIdx + 2];
      let a = background.data[pixelIdx + 3];

      // Alpha blend shadow on top of background
      const shadowBlend = alphaBlend(
        r, g, b, a,
        shadow.data[pixelIdx],
        shadow.data[pixelIdx + 1],
        shadow.data[pixelIdx + 2],
        shadow.data[pixelIdx + 3]
      );

      r = shadowBlend.r;
      g = shadowBlend.g;
      b = shadowBlend.b;
      a = shadowBlend.a;

      // Alpha blend foreground on top of (background + shadow)
      const foregroundBlend = alphaBlend(
        r, g, b, a,
        foreground.data[pixelIdx],
        foreground.data[pixelIdx + 1],
        foreground.data[pixelIdx + 2],
        foreground.data[pixelIdx + 3]
      );

      // Write final pixel
      result.data[pixelIdx] = foregroundBlend.r;
      result.data[pixelIdx + 1] = foregroundBlend.g;
      result.data[pixelIdx + 2] = foregroundBlend.b;
      result.data[pixelIdx + 3] = foregroundBlend.a;
    }

    return result;
  }

  /**
   * Alternative composite method: shadow under foreground only
   * (shadow does not appear on background areas outside foreground)
   *
   * This creates a more "attached" shadow effect
   *
   * @param background - Background image
   * @param shadow - Shadow layer (with alpha)
   * @param foreground - Foreground cutout (with alpha)
   * @param silhouetteMask - Binary mask of foreground
   * @returns Composite with shadow only under foreground
   */
  compositeAttachedShadow(
    background: ImageData,
    shadow: ImageData,
    foreground: ImageData,
    silhouetteMask: Uint8Array
  ): ImageData {
    const width = background.width;
    const height = background.height;
    const result = new ImageData(width, height);

    for (let i = 0; i < width * height; i++) {
      const pixelIdx = i * 4;

      let r = background.data[pixelIdx];
      let g = background.data[pixelIdx + 1];
      let b = background.data[pixelIdx + 2];
      let a = background.data[pixelIdx + 3];

      // Only apply shadow if NOT under foreground
      if (silhouetteMask[i] === 0) {
        const shadowBlend = alphaBlend(
          r, g, b, a,
          shadow.data[pixelIdx],
          shadow.data[pixelIdx + 1],
          shadow.data[pixelIdx + 2],
          shadow.data[pixelIdx + 3]
        );

        r = shadowBlend.r;
        g = shadowBlend.g;
        b = shadowBlend.b;
        a = shadowBlend.a;
      }

      // Always blend foreground on top
      const foregroundBlend = alphaBlend(
        r, g, b, a,
        foreground.data[pixelIdx],
        foreground.data[pixelIdx + 1],
        foreground.data[pixelIdx + 2],
        foreground.data[pixelIdx + 3]
      );

      result.data[pixelIdx] = foregroundBlend.r;
      result.data[pixelIdx + 1] = foregroundBlend.g;
      result.data[pixelIdx + 2] = foregroundBlend.b;
      result.data[pixelIdx + 3] = foregroundBlend.a;
    }

    return result;
  }
}
