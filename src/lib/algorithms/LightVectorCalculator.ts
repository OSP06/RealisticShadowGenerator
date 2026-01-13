/**
 * Calculates 3D directional light vector from angle and elevation
 */

import type { LightVector } from '../core/types';
import { degreesToRadians } from '../utils/math';

/**
 * LightVectorCalculator - Converts angle/elevation to 3D vector
 *
 * Light Model:
 * - Angle: 0-360° (horizontal direction, 0° = right, 90° = down, etc.)
 * - Elevation: 0-90° (vertical angle, 0° = horizontal, 90° = overhead)
 *
 * Vector Calculation:
 * - dx = cos(angle) * cos(elevation)
 * - dy = sin(angle) * cos(elevation)
 * - dz = sin(elevation)
 */
export class LightVectorCalculator {
  /**
   * Calculate 3D light direction vector from angle and elevation
   *
   * @param angleDegrees - Light direction angle (0-360°)
   * @param elevationDegrees - Light elevation angle (0-90°)
   * @returns LightVector with dx, dy, dz components
   */
  calculate(angleDegrees: number, elevationDegrees: number): LightVector {
    // Convert degrees to radians for trigonometric functions
    const angleRad = degreesToRadians(angleDegrees);
    const elevationRad = degreesToRadians(elevationDegrees);

    // Calculate 3D directional vector
    // dx: horizontal X component
    // dy: horizontal Y component
    // dz: vertical Z component (elevation)

    const dx = Math.cos(angleRad) * Math.cos(elevationRad);
    const dy = Math.sin(angleRad) * Math.cos(elevationRad);
    const dz = Math.sin(elevationRad);

    return { dx, dy, dz };
  }

  /**
   * Calculate shadow length multiplier based on elevation
   *
   * Physics:
   * - When elevation = 90° (overhead), shadow length = 0
   * - When elevation = 0° (horizontal), shadow length = infinite
   * - Lower elevation → longer shadows
   *
   * @param elevationDegrees - Light elevation angle (0-90°)
   * @returns Multiplier for shadow length (higher = longer shadow)
   */
  getShadowLengthMultiplier(elevationDegrees: number): number {
    const elevationRad = degreesToRadians(elevationDegrees);

    // Shadow length is inversely proportional to sin(elevation)
    // When elevation = 90°, sin(90°) = 1, multiplier = 1
    // When elevation = 0°, sin(0°) = 0, multiplier = very large

    const sinElevation = Math.sin(elevationRad);

    // Clamp to avoid division by zero at elevation = 0°
    // Use minimum of 0.1 to prevent extremely long shadows
    return 1.0 / Math.max(0.1, sinElevation);
  }

  /**
   * Get suggested shadow parameters based on light configuration
   * (Helper for realistic defaults)
   *
   * @param elevationDegrees - Light elevation angle (0-90°)
   * @returns Suggested contact opacity and falloff rate
   */
  getSuggestedShadowParams(elevationDegrees: number): {
    contactOpacity: number;
    falloffRate: number;
  } {
    // Lower elevation → sharper contact shadows, slower falloff
    // Higher elevation → softer shadows, faster falloff

    const elevationNorm = elevationDegrees / 90; // 0-1

    // Contact opacity: higher for low sun, lower for high sun
    const contactOpacity = 0.9 - elevationNorm * 0.3; // 0.6 - 0.9

    // Falloff rate: faster for high sun, slower for low sun
    const falloffRate = 3 + elevationNorm * 2; // 3 - 5

    return { contactOpacity, falloffRate };
  }
}
