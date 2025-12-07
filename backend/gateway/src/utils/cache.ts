/**
 * Simple in-memory cache with TTL (Time To Live)
 * Used to reduce API calls and rate limiting issues
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

class Cache {
    private store: Map<string, CacheEntry<any>> = new Map();

    /**
     * Set a value in cache with TTL
     * @param key Cache key
     * @param value Value to cache
     * @param ttl Time to live in milliseconds (default: 60000 = 1 minute)
     */
    set<T>(key: string, value: T, ttl: number = 60000): void {
        this.store.set(key, {
            data: value,
            timestamp: Date.now(),
            ttl
        });
    }

    /**
     * Get a value from cache if it exists and hasn't expired
     * @param key Cache key
     * @returns Cached value or null if not found or expired
     */
    get<T>(key: string): T | null {
        const entry = this.store.get(key);

        if (!entry) {
            return null;
        }

        const now = Date.now();
        const age = now - entry.timestamp;

        if (age > entry.ttl) {
            // Entry expired, remove it
            this.store.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Check if a key exists and is not expired
     * @param key Cache key
     * @returns true if key exists and is valid
     */
    has(key: string): boolean {
        return this.get(key) !== null;
    }

    /**
     * Delete a specific key from cache
     * @param key Cache key
     */
    delete(key: string): void {
        this.store.delete(key);
    }

    /**
     * Clear all expired entries
     */
    clearExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            const age = now - entry.timestamp;
            if (age > entry.ttl) {
                this.store.delete(key);
            }
        }
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.store.clear();
    }

    /**
     * Get current cache size
     */
    size(): number {
        return this.store.size;
    }
}

// Export singleton instance
export const cache = new Cache();

// Clean up expired entries every 5 minutes
setInterval(() => {
    cache.clearExpired();
}, 5 * 60 * 1000);
