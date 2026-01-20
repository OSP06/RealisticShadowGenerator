# Realistic Shadow Generator

A TypeScript library for generating realistic projected shadows for image compositing using HTML Canvas pixel trail.

## Features

- **True Geometric Projection**: Shadows are projected based on directional light vectors, not fake CSS effects
- **Contact Shadow Logic**: Sharp, dark shadows near the foreground with rapid falloff
- **Distance-Weighted Blur**: Gaussian blur that increases with distance from contact line
- **Depth Map Support**: Optional depth-aware shadow warping for uneven surfaces
- **Modular Architecture**: Clean separation of algorithms for easy customization
- **TypeScript**: Full type safety and excellent IDE support

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### Build

```bash
npm run build
```

## Usage

### Demo Application

The demo application provides a complete UI for testing the shadow generator:

1. **Upload Images**:
   - Foreground: PNG with alpha channel (cutout subject)
   - Background: Any image
   - Depth Map (optional): Grayscale depth map (0=near, 255=far)

2. **Adjust Light Parameters**:
   - Light Angle: 0-360° (direction)
   - Light Elevation: 0-90° (height)

3. **Generate & Download**:
   - Click "Generate Shadow"
   - Download outputs: shadow_only.png, mask_debug.png, composite.png

### Library Usage

```typescript
import { ShadowGenerator, ImageProcessor } from 'realistic-shadow-generator';

// Initialize
const generator = new ShadowGenerator();
const processor = new ImageProcessor();

// Load images
const foreground = await processor.loadFromFile(foregroundFile);
const background = await processor.loadFromFile(backgroundFile);

// Configure shadow
const config = generator.getDefaultConfig(135, 45); // angle, elevation

// Generate
const result = generator.generate(
  { foreground, background },
  config
);

// Use results
displayImageData(result.shadowOnly);
displayImageData(result.maskDebug);
displayImageData(result.composite);
```

## Architecture

### Core Pipeline

1. **Silhouette Extraction**: Extract binary mask from alpha channel
2. **Light Vector Calculation**: Convert angle/elevation to 3D vector
3. **Contact Line Detection**: Find lowest visible pixels
4. **Distance Transform**: Calculate distance from contact line
5. **Shadow Projection**: Project using Bresenham's line algorithm
6. **Opacity Falloff**: Exponential decay with distance
7. **Gaussian Blur**: Distance-weighted variable blur
8. **Compositing**: Alpha blend layers

### Project Structure

```
src/
├── lib/
│   ├── core/
│   │   ├── ShadowGenerator.ts    # Main orchestrator
│   │   ├── ImageProcessor.ts     # Image loading
│   │   └── types.ts              # TypeScript types
│   ├── algorithms/
│   │   ├── SilhouetteExtractor.ts
│   │   ├── LightVectorCalculator.ts
│   │   ├── ContactLineDetector.ts
│   │   ├── DistanceTransform.ts
│   │   ├── ShadowProjector.ts
│   │   └── BlurEngine.ts
│   ├── compositing/
│   │   └── ShadowCompositor.ts
│   └── utils/
│       ├── math.ts
│       └── imageData.ts
├── demo/
│   └── main.ts                    # Demo application
└── index.ts                       # Public API
```

## Algorithm Details

### Light Model

```
dx = cos(angle) * cos(elevation)
dy = sin(angle) * cos(elevation)
dz = sin(elevation)

shadowLength = baseLength / sin(elevation)
```

### Depth Warping

```
warp = 1.0 + depth * 0.5
projectedX = x - dx * shadowLength * warp
projectedY = y - dy * shadowLength * warp
```

### Opacity Falloff

```
opacity = contactOpacity * exp(-falloffRate * normalizedDistance)
```

### Blur Calculation

```
blurRadius = minBlur + (maxBlur - minBlur) * normalizedDistance
weight = exp(-(dx² + dy²) / (2*σ²))
```

## Configuration

### ShadowConfig Interface

```typescript
interface ShadowConfig {
  lightAngle: number;        // 0-360° (horizontal direction)
  lightElevation: number;    // 0-90° (vertical angle)
  maxShadowDistance: number; // Maximum projection distance (pixels)
  contactOpacity: number;    // Opacity at contact line (0-1)
  falloffRate: number;       // Fade speed (higher = faster)
  minBlurRadius: number;     // Blur at contact (pixels)
  maxBlurRadius: number;     // Blur at max distance (pixels)
}
```

### Default Values

- Light Angle: 135° (from upper-right)
- Light Elevation: 45° (mid-height)
- Max Shadow Distance: 150px
- Contact Opacity: 0.8
- Falloff Rate: 4
- Min Blur: 1px
- Max Blur: 10px

## Performance

The shadow generator prioritizes **correctness over speed**:

- Explicit per-pixel loops (no GPU acceleration)
- Distance-weighted Gaussian blur: O(n × k²) where k=kernel size
- Distance transform: O(n × m) where m=contact points
- Typical generation time: 1-5 seconds for 800×600 images

For production use, consider:
- Caching generated shadows
- Generating at lower resolution and upscaling
- Running in Web Worker for non-blocking UI

## Outputs

### shadow_only.png
Transparent PNG with black shadow only. Can be composited onto any background.

### mask_debug.png
Binary silhouette mask showing foreground extraction. White = foreground, black = background.

### composite.png
Final composition: background + shadow + foreground. Ready to use.

## Design Constraints

✅ No CSS drop-shadow or fake effects
✅ True geometric projection with directional light
✅ Shadow stretches, fades, and blurs with distance
✅ Contact shadow logic with distance transform
✅ Canvas pixel buffers with explicit per-pixel loops
✅ Clear math comments throughout
✅ Modular, reusable architecture

## Browser Compatibility

Requires modern browser with:
- Canvas API
- ES2020 JavaScript
- File API (for demo)

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

ISC

## Credits

Developed as a demonstration of realistic shadow generation for image compositing using Canvas pixel manipulation and geometric projection algorithms.