// utils/image-processor.js

export class ImageProcessor {
    static TARGET_FILE_SIZE = 500 * 1024; // Target 500KB maximum
    static MIN_QUALITY = 0.3; // Don't go below 30% quality
    static MAX_DIMENSION = 1200; // Maximum dimension for any side

    // Check browser support for different formats
    static async checkFormatSupport() {
        const formats = {
            avif: false,
            webp: false
        };

        try {
            // Test WebP support more reliably
            const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
            const webpImg = new Image();
            await new Promise((resolve, reject) => {
                webpImg.onload = () => {
                    formats.webp = true;
                    resolve();
                };
                webpImg.onerror = () => {
                    formats.webp = false;
                    resolve();
                };
                webpImg.src = webpData;
            });

            // Test AVIF support
            const avifData = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
            const avifImg = new Image();
            await new Promise((resolve, reject) => {
                avifImg.onload = () => {
                    formats.avif = true;
                    resolve();
                };
                avifImg.onerror = () => {
                    formats.avif = false;
                    resolve();
                };
                avifImg.src = avifData;
            });
        } catch (error) {
            console.warn('Error checking format support:', error);
        }

        console.log('Supported formats:', formats);
        return formats;
    }

    // Create square crop from center of image
    static createSquareCrop(image) {
        const canvas = document.createElement('canvas');
        const size = Math.min(image.width, image.height);
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        const offsetX = (image.width - size) / 2;
        const offsetY = (image.height - size) / 2;

        ctx.drawImage(image, offsetX, offsetY, size, size, 0, 0, size, size);
        return canvas;
    }

    

    // Main processing function
    static async processImage(file, targetSize = 800) {
        console.log('Starting image processing');
        
        // Load and resize image
        const image = await this.loadImage(file);
        const resizedCanvas = this.resizeImage(image, this.MAX_DIMENSION);
        
        // Create square crop
        const squareCanvas = this.createSquareCrop(resizedCanvas);
        console.log('Square crop created:', squareCanvas.width, 'x', squareCanvas.height);
        
        // Check format support
        const formats = await this.checkFormatSupport();
        console.log('Format support checked:', formats);
        
        // Try formats in order of preference
        let result = null;
        
        // Try AVIF first
        if (formats.avif) {
            console.log('Attempting AVIF compression');
            result = await this.compressWithFormat(squareCanvas, 'avif');
        }
        
        // Try WebP if AVIF fails or isn't supported
        if (!result && formats.webp) {
            console.log('Attempting WebP compression');
            result = await this.compressWithFormat(squareCanvas, 'webp');
        }
        
        // Fallback to JPEG if all else fails
        if (!result) {
            console.log('Falling back to JPEG compression');
            result = await this.compressWithFormat(squareCanvas, 'jpeg');
        }
    
        if (!result) {
            throw new Error('Failed to compress image with any supported format');
        }
    
        console.log('Final image result:', {
            format: result.format,
            size: Math.round(result.blob.size / 1024) + 'KB',
            dimensions: `${result.width}x${result.height}`,
            mimeType: result.mimeType
        });
    
        return result;
    }

    static async compressWithFormat(canvas, format) {
        const mimeType = `image/${format}`;
        let quality = 0.85;
        let blob = null;
        let attempts = 0;
        const maxAttempts = 5;
    
        while (attempts < maxAttempts) {
            attempts++;
            console.log(`${format} compression attempt ${attempts} with quality ${quality}`);
    
            let newBlob;
            switch (format) {
                case 'avif':
                    newBlob = await this.encodeAVIF(canvas, quality);
                    break;
                case 'webp':
                    newBlob = await this.encodeWebP(canvas, quality);
                    break;
                default:
                    newBlob = await this.encodeJPEG(canvas, quality);
                    break;
            }
    
            if (!newBlob) {
                console.log(`${format} encoding failed, trying next format`);
                return null;
            }
    
            // Keep track of the best result so far
            if (!blob || newBlob.size < blob.size) {
                blob = newBlob;
            }
    
            console.log(`Compressed size: ${Math.round(blob.size / 1024)}KB`);
    
            if (blob.size <= this.TARGET_FILE_SIZE) {
                break;
            }
    
            // Calculate new quality for next attempt
            const ratio = Math.sqrt(this.TARGET_FILE_SIZE / blob.size);
            quality = Math.max(this.MIN_QUALITY, quality * ratio);
    
            if (quality <= this.MIN_QUALITY) {
                // Try reducing dimensions instead
                const scale = Math.sqrt(this.TARGET_FILE_SIZE / blob.size);
                const newWidth = Math.floor(canvas.width * scale);
                const newHeight = Math.floor(canvas.height * scale);
                
                const scaledCanvas = document.createElement('canvas');
                scaledCanvas.width = newWidth;
                scaledCanvas.height = newHeight;
                
                const ctx = scaledCanvas.getContext('2d');
                ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
                canvas = scaledCanvas;
                quality = 0.7;
            }
        }
    
        return {
            blob: blob,
            format: format.toUpperCase(),
            width: canvas.width,
            height: canvas.height,
            mimeType: mimeType
        };
    }

    // Update encode methods to explicitly set mime type
static async encodeAVIF(canvas, quality) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            if (blob && blob.size > 0) {
                resolve(new Blob([blob], { type: 'image/avif' }));
            } else {
                resolve(null);
            }
        }, 'image/avif', quality);
    });
}

static async encodeWebP(canvas, quality) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            if (blob && blob.size > 0) {
                resolve(new Blob([blob], { type: 'image/webp' }));
            } else {
                resolve(null);
            }
        }, 'image/webp', quality);
    });
}

static async encodeJPEG(canvas, quality) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            if (blob && blob.size > 0) {
                resolve(new Blob([blob], { type: 'image/jpeg' }));
            } else {
                resolve(null);
            }
        }, 'image/jpeg', quality);
    });
}

    static resizeImage(image, maxDimension) {
        const canvas = document.createElement('canvas');
        let width = image.width;
        let height = image.height;

        if (width > height && width > maxDimension) {
            height = Math.round(height * (maxDimension / width));
            width = maxDimension;
        } else if (height > maxDimension) {
            width = Math.round(width * (maxDimension / height));
            height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, width, height);
        
        console.log(`Image resized to ${width}x${height}`);
        return canvas;
    }

    // Helper function to load image
    static loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                console.log('Image loaded with dimensions:', img.width, 'x', img.height);
                resolve(img);
            };
            img.onerror = (error) => {
                console.error('Error loading image:', error);
                reject(new Error('Failed to load image'));
            };
            img.src = URL.createObjectURL(file);
        });
    }
}