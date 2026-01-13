/**
 * Main shadow generation pipeline orchestrator
 */

import type { ImageSet, ShadowConfig, ShadowResult } from './types';
import { SilhouetteExtractor } from '../algorithms/SilhouetteExtractor';
import { LightVectorCalculator } from '../algorithms/LightVectorCalculator';
import { ContactLineDetector } from '../algorithms/ContactLineDetector';
import { DistanceTransform } from '../algorithms/DistanceTransform';
import { ShadowProjector } from '../algorithms/ShadowProjector';
import { BlurEngine } from '../algorithms/BlurEngine';
import { ShadowCompositor } from '../compositing/ShadowCompositor';

/**
 * ShadowGenerator - Main orchestrator for realistic shadow generation
 *
 * Pipeline:
 * 1. Extract silhouette from foreground alpha channel
 * 2. Calculate light vector from angle/elevation
 * 3. Detect contact line (lowest visible pixels)
 * 4. Compute distance transform from contact line
 * 5. Project shadow based on light vector
 * 6. Apply opacity falloff based on distance
 * 7. Apply distance-weighted Gaussian blur
 * 8. Generate debug mask
 * 9. Composite final image
 *
 * Returns: { shadowOnly, maskDebug, composite }
 */
export class ShadowGenerator {
  private silhouetteExtractor: SilhouetteExtractor;
  private lightCalculator: LightVectorCalculator;
  private contactDetector: ContactLineDetector;
  private distanceTransform: DistanceTransform;
  private shadowProjector: ShadowProjector;
  private blurEngine: BlurEngine;
  private compositor: ShadowCompositor;

  constructor() {
    // Initialize all algorithm modules
    this.silhouetteExtractor = new SilhouetteExtractor();
    this.lightCalculator = new LightVectorCalculator();
    this.contactDetector = new ContactLineDetector();
    this.distanceTransform = new DistanceTransform();
    this.shadowProjector = new ShadowProjector();
    this.blurEngine = new BlurEngine();
    this.compositor = new ShadowCompositor();
  }

  /**
   * Generate realistic shadow for image composition
   *
   * @param images - Input images (foreground, background, optional depth map)
   * @param config - Shadow configuration (angle, elevation, opacity, etc.)
   * @returns ShadowResult with all outputs
   */
  generate(images: ImageSet, config: ShadowConfig): ShadowResult {
    const width = images.foreground.width;
    const height = images.foreground.height;

    console.log('🎬 Starting shadow generation pipeline...');
    console.log(`   Image size: ${width}x${height}`);
    console.log(`   Light angle: ${config.lightAngle}°`);
    console.log(`   Light elevation: ${config.lightElevation}°`);

    // STEP 1: Extract silhouette from alpha channel
    console.log('📸 Step 1/9: Extracting silhouette...');
    const silhouette = this.silhouetteExtractor.extract(images.foreground);

    // STEP 2: Calculate light vector from angle/elevation
    console.log('☀️  Step 2/9: Calculating light vector...');
    const lightVector = this.lightCalculator.calculate(
      config.lightAngle,
      config.lightElevation
    );

    const shadowLengthMultiplier = this.lightCalculator.getShadowLengthMultiplier(
      config.lightElevation
    );

    const shadowLength = shadowLengthMultiplier * config.maxShadowDistance;

    console.log(`   Light vector: (${lightVector.dx.toFixed(3)}, ${lightVector.dy.toFixed(3)}, ${lightVector.dz.toFixed(3)})`);
    console.log(`   Shadow length: ${shadowLength.toFixed(1)}px`);

    // STEP 3: Detect contact line (lowest visible pixels)
    console.log('🔍 Step 3/9: Detecting contact line...');
    const contactLine = this.contactDetector.detect(silhouette, width, height);
    console.log(`   Contact points: ${contactLine.points.length}`);

    // STEP 4: Calculate distance from contact line
    console.log('📏 Step 4/9: Computing distance transform...');
    const distanceMap = this.distanceTransform.compute(
      silhouette,
      contactLine,
      width,
      height
    );

    // STEP 5: Project shadow based on light vector
    console.log('🎯 Step 5/9: Projecting shadow...');
    let shadowMask = this.shadowProjector.project(
      silhouette,
      width,
      height,
      lightVector,
      shadowLength,
      images.depthMap
    );

    // Remove shadow pixels that are occluded by foreground
    shadowMask = this.shadowProjector.removeOcclusions(
      shadowMask,
      silhouette,
      width,
      height
    );

    // STEP 6: Create shadow layer with opacity falloff
    console.log('🌑 Step 6/9: Applying opacity falloff...');
    let shadowLayer = this.compositor.createShadowLayer(
      shadowMask,
      distanceMap,
      config,
      width,
      height
    );

    // STEP 7: Apply distance-weighted blur
    console.log('🌫️  Step 7/9: Applying Gaussian blur...');
    console.log(`   Blur range: ${config.minBlurRadius}px - ${config.maxBlurRadius}px`);
    shadowLayer = this.blurEngine.applyDistanceWeightedBlur(
      shadowLayer,
      distanceMap,
      config.minBlurRadius,
      config.maxBlurRadius,
      config.maxShadowDistance
    );

    // STEP 8: Generate mask debug output
    console.log('🐛 Step 8/9: Generating debug mask...');
    const maskDebug = this.silhouetteExtractor.maskToImageData(
      silhouette,
      width,
      height
    );

    // STEP 9: Composite final image
    console.log('🎨 Step 9/9: Compositing final image...');
    const composite = this.compositor.composite(
      images.background,
      shadowLayer,
      images.foreground
    );

    console.log('✅ Shadow generation complete!');

    return {
      shadowOnly: shadowLayer,
      maskDebug: maskDebug,
      composite: composite
    };
  }

  /**
   * Get default shadow configuration
   * (useful starting point for users)
   *
   * @param lightAngle - Light direction angle (0-360)
   * @param lightElevation - Light elevation angle (0-90)
   * @returns Default ShadowConfig
   */
  getDefaultConfig(
    lightAngle: number = 135,
    lightElevation: number = 45
  ): ShadowConfig {
    // Get suggested parameters based on elevation
    const suggested = this.lightCalculator.getSuggestedShadowParams(lightElevation);

    return {
      lightAngle,
      lightElevation,
      maxShadowDistance: 150,
      contactOpacity: suggested.contactOpacity,
      falloffRate: suggested.falloffRate,
      minBlurRadius: 1,
      maxBlurRadius: 10
    };
  }

  /**
   * Validate input images
   * Checks for required properties and compatible dimensions
   *
   * @param images - Input images to validate
   * @throws Error if validation fails
   */
  validateImages(images: ImageSet): void {
    if (!images.foreground) {
      throw new Error('Foreground image is required');
    }

    if (!images.background) {
      throw new Error('Background image is required');
    }

    const fgWidth = images.foreground.width;
    const fgHeight = images.foreground.height;
    const bgWidth = images.background.width;
    const bgHeight = images.background.height;

    // Warn if dimensions don't match (will be handled by caller)
    if (fgWidth !== bgWidth || fgHeight !== bgHeight) {
      console.warn(
        `⚠️  Image dimension mismatch: foreground ${fgWidth}x${fgHeight}, background ${bgWidth}x${bgHeight}`
      );
    }

    // Check depth map if provided
    if (images.depthMap) {
      const dmWidth = images.depthMap.width;
      const dmHeight = images.depthMap.height;

      if (dmWidth !== fgWidth || dmHeight !== fgHeight) {
        console.warn(
          `⚠️  Depth map dimension mismatch: ${dmWidth}x${dmHeight}, expected ${fgWidth}x${fgHeight}`
        );
      }
    }
  }
}
