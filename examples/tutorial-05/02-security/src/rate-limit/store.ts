/**
 * Memory Store for Rate Limiting
 * In-memory storage backend for rate limiter
 */

export interface StoreEntry {
  count: number;
  resetTime: number;
}

export class MemoryStore {
  private store: Map<string, StoreEntry> = new Map();

  /**
   * Increment counter
   */
  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      const newEntry: StoreEntry = {
        count: 1,
        resetTime: now + windowMs
      };
      this.store.set(key, newEntry);
      return { count: 1, resetTime: newEntry.resetTime };
    }

    entry.count++;
    return { count: entry.count, resetTime: entry.resetTime };
  }

  /**
   * Reset counter
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Get entry
   */
  get(key: string): StoreEntry | undefined {
    return this.store.get(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}
