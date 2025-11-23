/**
 * Image preloader utility for improving perceived performance
 * Preloads images that are likely to be viewed next
 */

import { Image } from 'react-native';

class ImagePreloader {
  private preloadedImages: Set<string> = new Set();
  private preloadingQueue: string[] = [];

  /**
   * Preload a single image using React Native's Image.prefetch
   */
  preloadImage(uri: string): Promise<void> {
    if (this.preloadedImages.has(uri)) {
      return Promise.resolve();
    }

    return Image.prefetch(uri)
      .then(() => {
        this.preloadedImages.add(uri);
      })
      .catch(() => {
        // Silently fail for preloading - it's just an optimization
      });
  }

  /**
   * Preload multiple images
   */
  async preloadImages(uris: string[]): Promise<void> {
    const uniqueUris = uris.filter(uri => !this.preloadedImages.has(uri));
    if (uniqueUris.length === 0) return;

    // Preload up to 3 images at a time to avoid overwhelming the network
    const batchSize = 3;
    for (let i = 0; i < uniqueUris.length; i += batchSize) {
      const batch = uniqueUris.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(uri => this.preloadImage(uri).catch(() => {
          // Silently fail for preloading - it's just an optimization
        }))
      );
    }
  }

  /**
   * Preload images for a carousel (current, next, previous)
   */
  preloadCarouselImages(imageUrls: string[], currentIndex: number): void {
    const urisToPreload: string[] = [];
    
    // Preload current image (if not already loaded)
    if (imageUrls[currentIndex]) {
      urisToPreload.push(imageUrls[currentIndex]);
    }
    
    // Preload next image
    if (currentIndex + 1 < imageUrls.length) {
      urisToPreload.push(imageUrls[currentIndex + 1]);
    }
    
    // Preload previous image
    if (currentIndex - 1 >= 0) {
      urisToPreload.push(imageUrls[currentIndex - 1]);
    }

    // Preload in background without blocking
    this.preloadImages(urisToPreload).catch(() => {
      // Silently fail
    });
  }

  /**
   * Check if an image is already preloaded
   */
  isPreloaded(uri: string): boolean {
    return this.preloadedImages.has(uri);
  }

  /**
   * Clear preloaded images cache (useful for memory management)
   */
  clearCache(): void {
    this.preloadedImages.clear();
  }
}

// Export singleton instance
export const imagePreloader = new ImagePreloader();

