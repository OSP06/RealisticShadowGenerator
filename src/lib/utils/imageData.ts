/**
 * Utility functions for working with ImageData buffers
 */

/**
 * Create a blank ImageData of specified dimensions
 */
export function createImageData(width: number, height: number): ImageData {
  return new ImageData(width, height);
}

/**
 * Clone an ImageData object
 */
export function cloneImageData(source: ImageData): ImageData {
  const clone = new ImageData(source.width, source.height);
  clone.data.set(source.data);
  return clone;
}

/**
 * Get pixel index in ImageData.data array
 * ImageData stores pixels as [R, G, B, A, R, G, B, A, ...]
 */
export function getPixelIndex(x: number, y: number, width: number): number {
  return (y * width + x) * 4;
}

/**
 * Get pixel color at (x, y) from ImageData
 */
export function getPixel(
  imageData: ImageData,
  x: number,
  y: number
): { r: number; g: number; b: number; a: number } {
  const idx = getPixelIndex(x, y, imageData.width);
  return {
    r: imageData.data[idx],
    g: imageData.data[idx + 1],
    b: imageData.data[idx + 2],
    a: imageData.data[idx + 3]
  };
}

/**
 * Set pixel color at (x, y) in ImageData
 */
export function setPixel(
  imageData: ImageData,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a: number
): void {
  const idx = getPixelIndex(x, y, imageData.width);
  imageData.data[idx] = r;
  imageData.data[idx + 1] = g;
  imageData.data[idx + 2] = b;
  imageData.data[idx + 3] = a;
}

/**
 * Fill entire ImageData with a color
 */
export function fillImageData(
  imageData: ImageData,
  r: number,
  g: number,
  b: number,
  a: number
): void {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
}

/**
 * Check if coordinates are within ImageData bounds
 */
export function isInBounds(
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

/**
 * Alpha blend two colors using Porter-Duff "over" operation
 * backdrop = background color, source = foreground color
 */
export function alphaBlend(
  backdropR: number,
  backdropG: number,
  backdropB: number,
  backdropA: number,
  sourceR: number,
  sourceG: number,
  sourceB: number,
  sourceA: number
): { r: number; g: number; b: number; a: number } {
  // Normalize alpha from 0-255 to 0-1
  const srcA = sourceA / 255;
  const dstA = backdropA / 255;

  // If source is fully transparent, return backdrop
  if (srcA === 0) {
    return { r: backdropR, g: backdropG, b: backdropB, a: backdropA };
  }

  // Porter-Duff "over" operation
  const outA = srcA + dstA * (1 - srcA);

  let outR = backdropR;
  let outG = backdropG;
  let outB = backdropB;

  if (outA > 0) {
    outR = (sourceR * srcA + backdropR * dstA * (1 - srcA)) / outA;
    outG = (sourceG * srcA + backdropG * dstA * (1 - srcA)) / outA;
    outB = (sourceB * srcA + backdropB * dstA * (1 - srcA)) / outA;
  }

  return {
    r: Math.round(outR),
    g: Math.round(outG),
    b: Math.round(outB),
    a: Math.round(outA * 255)
  };
}
