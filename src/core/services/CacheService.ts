interface CacheItem<T> {
  value: T;
  expiry: number;
  hits: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

class OptimizedCache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private stats = { hits: 0, misses: 0 };
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(maxSize = 10000, defaultTTL = 300000) { // 5 minutes default
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.startCleanup();
  }

  public set(key: string, value: T, ttl = this.defaultTTL): void {
    // Cleanup if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const expiry = Date.now() + ttl;
    this.cache.set(key, {
      value,
      expiry,
      hits: 0,
      lastAccessed: Date.now()
    });
  }

  public get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access stats
    item.hits++;
    item.lastAccessed = Date.now();
    this.stats.hits++;
    
    return item.value;
  }

  public has(key: string): boolean {
    const item = this.cache.get(key);
    return item !== undefined && Date.now() <= item.expiry;
  }

  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache) {
        if (now > item.expiry) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Every minute
  }

  public getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0
    };
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Cache instances for different data types
export const contactCache = new OptimizedCache<any>(5000, 600000); // 10 minutes
export const conversationCache = new OptimizedCache<any>(10000, 300000); // 5 minutes
export const messageCache = new OptimizedCache<any>(50000, 60000); // 1 minute
export const qrCodeCache = new OptimizedCache<string>(100, 120000); // 2 minutes