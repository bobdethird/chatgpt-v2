import { z } from "zod";

// Helper for numeric strings
const numericString = z.string().transform((val) => {
    const num = parseFloat(val.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? null : num;
});

// Helper for currency extraction
const currencyExtractor = z.string().transform((val) => {
    // Very basic extraction, defaulting to USD if "$" present or just assume USD per spec
    return "USD";
});

export const ShopResultSchema = z.object({
    title: z.string().default("Unknown Product"),
    price: z.object({
        amount: z.union([z.number(), numericString]).nullable().default(null),
        currency: z.literal("USD").default("USD"),
        raw: z.string().nullable().default(null),
    }).default({ amount: null, currency: "USD", raw: null }),
    merchant: z.string().nullable().default(null),
    url: z.string().url().default("https://example.com"),
    image_url: z.string().url().nullable().default(null),
    description: z.string().nullable().default(null),
    availability: z.enum(["in_stock", "out_of_stock", "unknown"]).default("unknown"),
    key_features: z.array(z.string()).default([]),
    shipping_summary: z.string().nullable().default(null),
    rating_summary: z.object({
        rating: z.union([z.number(), numericString]).nullable().default(null),
        count: z.union([z.number(), numericString]).nullable().default(null),
    }).default({ rating: null, count: null }),
    evidence: z.array(z.object({
        type: z.enum(["exa", "dom", "screenshot"]),
        source: z.string(),
        snippet: z.string().nullable(),
    })).default([]),
});

export const ShopResponseSchema = z.object({
    query: z.string(),
    currency: z.literal("USD").default("USD"),
    results: z.array(ShopResultSchema),
    meta: z.object({
        exa_candidates_considered: z.number().default(0),
        stagehand_pages_opened: z.number().default(0),
        cache_hit: z.boolean().default(false),
        latency_ms: z.number().default(0),
    }),
});

export function validateShopResult(data: unknown) {
    const result = ShopResultSchema.safeParse(data);
    if (result.success) {
        return result.data;
    }
    // Repair logic: if totally failed, return a minimal valid object or try to salvage?
    // Zod defaults above handle most missing fields.
    // If input is not an object, we can't do much.
    console.warn("Validation failed for one result, improved schema repair used defaults.", result.error);
    // Return a fallback valid object
    return {
        title: "Invalid Product Data",
        price: { amount: null, currency: "USD", raw: null },
        merchant: null,
        url: "https://example.com",
        image_url: null,
        description: null,
        availability: "unknown",
        key_features: [],
        shipping_summary: null,
        rating_summary: { rating: null, count: null },
        evidence: [],
    } as z.infer<typeof ShopResultSchema>;
}
