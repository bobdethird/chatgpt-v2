import { ShopResponse, ShopCacheEntry } from "./types";

const cache = new Map<string, ShopCacheEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getCachedResult(key: string): ShopResponse | null {
    const entry = cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > TTL_MS) {
        cache.delete(key);
        return null;
    }

    return entry.response;
}

export function setCachedResult(key: string, response: ShopResponse) {
    cache.set(key, {
        response,
        timestamp: Date.now(),
    });
}

export function generateCacheKey(query: string, budget?: number, limit?: number): string {
    return `${query.toLowerCase()}|${budget || ''}|${limit || 10}`;
}
