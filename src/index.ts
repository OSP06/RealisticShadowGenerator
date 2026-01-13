/**
 * Realistic Shadow Generator - Public API
 *
 * A TypeScript library for generating realistic projected shadows
 * for image compositing using Canvas pixel manipulation.
 */

// Main shadow generator
export { ShadowGenerator } from './lib/core/ShadowGenerator';

// Image processing utilities
export { ImageProcessor } from './lib/core/ImageProcessor';
export { BackgroundRemover } from './lib/core/BackgroundRemover';
export type { BackgroundRemovalOptions } from './lib/core/BackgroundRemover';

// Core types
export type {
  ShadowConfig,
  ImageSet,
  LightVector,
  ShadowResult,
  ContactLine,
  DistanceMap
} from './lib/core/types';

// Individual algorithm modules (for advanced users)
export { SilhouetteExtractor } from './lib/algorithms/SilhouetteExtractor';
export { LightVectorCalculator } from './lib/algorithms/LightVectorCalculator';
export { ContactLineDetector } from './lib/algorithms/ContactLineDetector';
export { DistanceTransform } from './lib/algorithms/DistanceTransform';
export { ShadowProjector } from './lib/algorithms/ShadowProjector';
export { BlurEngine } from './lib/algorithms/BlurEngine';
export { ShadowCompositor } from './lib/compositing/ShadowCompositor';

// Utility functions
export * from './lib/utils/math';
export * from './lib/utils/imageData';
