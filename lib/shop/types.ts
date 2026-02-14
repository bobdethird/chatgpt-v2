import { z } from "zod";

export interface ShopResult {
    title: string;
    price: {
        amount: number | null;
        currency: "USD";
        raw: string | null;
    };
    merchant: string | null;
    url: string;
    image_url: string | null;
    description: string | null;
    availability: "in_stock" | "out_of_stock" | "unknown";
    key_features: string[];
    shipping_summary: string | null;
    rating_summary: {
        rating: number | null;
        count: number | null;
    };
    evidence: {
        type: "exa" | "dom" | "screenshot";
        source: string;
        snippet: string | null;
    }[];
}

export interface ShopResponse {
    query: string;
    currency: "USD";
    results: ShopResult[];
    meta: {
        exa_candidates_considered: number;
        stagehand_pages_opened: number;
        cache_hit: boolean;
        latency_ms: number;
    };
}

export interface ShopCacheEntry {
    response: ShopResponse;
    timestamp: number;
}
