/**
 * Core type definitions for the Realistic Shadow Generator
 */

/**
 * Configuration for shadow generation
 */
export interface ShadowConfig {
  /** Light direction angle in degrees (0-360) */
  lightAngle: number;

  /** Light elevation angle in degrees (0-90, where 90 is directly overhead) */
  lightElevation: number;

  /** Maximum shadow projection distance in pixels */
  maxShadowDistance: number;

  /** Shadow opacity at the contact line (0-1) */
  contactOpacity: number;

  /** Rate at which shadow fades with distance (higher = faster fadeout) */
  falloffRate: number;

  /** Minimum blur radius at contact line (pixels) */
  minBlurRadius: number;

  /** Maximum blur radius at max distance (pixels) */
  maxBlurRadius: number;
}

/**
 * Set of input images for shadow generation
 */
export interface ImageSet {
  /** Foreground image with alpha channel (cutout subject) */
  foreground: ImageData;

  /** Background image */
  background: ImageData;

  /** Optional grayscale depth map (0=near, 255=far) */
  depthMap?: ImageData;
}

/**
 * 3D directional light vector
 */
export interface LightVector {
  /** X component of light direction */
  dx: number;

  /** Y component of light direction */
  dy: number;

  /** Z component (elevation) */
  dz: number;
}

/**
 * Result of shadow generation containing all outputs
 */
export interface ShadowResult {
  /** Transparent PNG with shadow only */
  shadowOnly: ImageData;

  /** Binary silhouette mask for debugging */
  maskDebug: ImageData;

  /** Final composite image (background + shadow + foreground) */
  composite: ImageData;
}

/**
 * Contact line representing the lowest visible pixels of the silhouette
 */
export interface ContactLine {
  /** Array of contact points at the base of the silhouette */
  points: Array<{ x: number; y: number }>;
}

/**
 * Distance map storing distance from contact line for each pixel
 */
export interface DistanceMap {
  /** Distance values (Float32Array for precision) */
  data: Float32Array;

  /** Width of the distance map */
  width: number;

  /** Height of the distance map */
  height: number;
}
