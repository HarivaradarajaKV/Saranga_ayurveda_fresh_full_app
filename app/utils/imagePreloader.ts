/**
 * Image preloader utility — uses expo-image prefetch so preloaded images
 * share the same disk cache used by OptimizedImage.
 * Preloading stores them on disk: subsequent renders are instant.
 */

import { Image as ExpoImage } from 'expo-image';

class ImagePreloader {
  private preloadedUris: Set<string> = new Set();
  private inFlight: Map<string, Promise<void>> = new Map();

  /**
   * Prefetch a single image into expo-image's disk cache.
   */
  preloadImage(uri: string): Promise<void> {
    if (!uri || !uri.startsWith('http')) return Promise.resolve();
    if (this.preloadedUris.has(uri)) return Promise.resolve();

    // Deduplicate in-flight requests
    if (this.inFlight.has(uri)) return this.inFlight.get(uri)!;

    const promise = ExpoImage.prefetch(uri, 'memory-disk')
      .then(() => {
        this.preloadedUris.add(uri);
      })
      .catch(() => {
        // Silently fail — prefetch is best-effort
      })
      .finally(() => {
        this.inFlight.delete(uri);
      });

    this.inFlight.set(uri, promise);
    return promise;
  }

  /**
   * Prefetch multiple images in parallel batches.
   * Uses a larger batch size now that expo-image handles queuing natively.
   */
  async preloadImages(uris: string[]): Promise<void> {
    const unique = uris.filter(
      uri => uri && uri.startsWith('http') && !this.preloadedUris.has(uri)
    );
    if (unique.length === 0) return;

    // Prefetch in batches of 6 — expo-image queues internally so this is safe
    const batchSize = 6;
    for (let i = 0; i < unique.length; i += batchSize) {
      const batch = unique.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(uri => this.preloadImage(uri)));
    }
  }

  /**
   * Preload images for a carousel — current, next, and previous.
   */
  preloadCarouselImages(imageUrls: string[], currentIndex: number): void {
    const toPreload: string[] = [];

    // Current + adjacent images
    [-1, 0, 1, 2].forEach(offset => {
      const idx = currentIndex + offset;
      if (idx >= 0 && idx < imageUrls.length && imageUrls[idx]) {
        toPreload.push(imageUrls[idx]);
      }
    });

    this.preloadImages(toPreload).catch(() => { /* best-effort */ });
  }

  /**
   * Preload the first image of every product in a list (for product grids).
   */
  preloadProductImages(products: Array<{ image_url?: string }>): void {
    const uris = products
      .map(p => p.image_url)
      .filter(Boolean) as string[];
    this.preloadImages(uris).catch(() => { /* best-effort */ });
  }

  isPreloaded(uri: string): boolean {
    return this.preloadedUris.has(uri);
  }

  clearCache(): void {
    this.preloadedUris.clear();
  }
}

// Singleton instance
export const imagePreloader = new ImagePreloader();
