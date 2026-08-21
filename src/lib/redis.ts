import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

class CacheService {
  private redis: Redis | null = null;
  private memoryCache = new Map<string, { val: any; expiresAt: number }>();

  constructor() {
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        this.redis = new Redis({
          url: env.UPSTASH_REDIS_REST_URL,
          token: env.UPSTASH_REDIS_REST_TOKEN,
        });
      } catch (err) {
        console.warn("Failed to initialize Upstash Redis client:", err);
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      try {
        const res = await this.redis.get<T>(key);
        if (res !== null && res !== undefined) return res;
      } catch (e) {
        console.warn("Redis get error, falling back to memory:", e);
      }
    }
    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.val as T;
  }

  async set(key: string, value: any, options?: { ex?: number }): Promise<void> {
    const ttlSeconds = options?.ex ?? 60;
    if (this.redis) {
      try {
        await this.redis.set(key, value, { ex: ttlSeconds });
        return;
      } catch (e) {
        console.warn("Redis set error, falling back to memory:", e);
      }
    }
    this.memoryCache.set(key, {
      val: value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (e) {}
    }
    this.memoryCache.delete(key);
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
  }
}

export const redis = new CacheService();
