import { removeBackground, Config } from '@imgly/background-removal';

export interface BackgroundRemovalOptions {
  model?: 'small' | 'medium';
  progress?: (stage: string, progress: number) => void;
}

export class BackgroundRemover {
  public modelLoaded: boolean = false;

  async removeBackground(
    imageData: ImageData,
    options?: BackgroundRemovalOptions
  ): Promise<ImageData> {
    // Convert ImageData to Blob
    const blob = await this.imageDataToBlob(imageData);

    // Configure background removal
    const config: Config = {
      model: options?.model || 'medium',
      progress: (key, current, total) => {
        if (options?.progress) {
          options.progress(key, current / total);
        }
      }
    };

    // Remove background (returns Blob)
    const resultBlob = await removeBackground(blob, config);

    // Convert result back to ImageData
    const resultImageData = await this.blobToImageData(resultBlob);

    this.modelLoaded = true;
    return resultImageData;
  }

  async preloadModel(): Promise<void> {
    // Create tiny 1x1 image to trigger model load
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 1, 1);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to create blob')));
    });

    await removeBackground(blob, { model: 'medium' });
    this.modelLoaded = true;
  }

  private async imageDataToBlob(imageData: ImageData): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context');

    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert ImageData to Blob'));
      }, 'image/png');
    });
  }

  private async blobToImageData(blob: Blob): Promise<ImageData> {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        URL.revokeObjectURL(url);
        resolve(imageData);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image from blob'));
      };

      img.src = url;
    });
  }
}
