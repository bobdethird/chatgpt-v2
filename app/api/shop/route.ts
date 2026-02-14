import { NextRequest, NextResponse } from "next/server";
import { getCachedResult, setCachedResult, generateCacheKey } from "@/lib/shop/cache";
import { searchExa } from "@/lib/shop/exa";
import { processWithStagehand } from "@/lib/shop/stagehand";
import { rankResults } from "@/lib/shop/rank";
import { ShopResponse, ShopResult } from "@/lib/shop/types";
import { validateShopResult } from "@/lib/shop/schema";

export async function GET(request: NextRequest) {
    const start = Date.now();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q"); // Changed from "query" to "q" per spec but let's support both just in case, wait Spec says "q (required)".
    const budgetStr = searchParams.get("budget");
    const limitStr = searchParams.get("limit");

    if (!query) {
        return NextResponse.json({ error: "Missing 'q' parameter" }, { status: 400 });
    }

    const budget = budgetStr ? parseFloat(budgetStr) : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;

    // 1. Check Cache
    const cacheKey = generateCacheKey(query, budget, limit);
    const cached = getCachedResult(cacheKey);
    if (cached) {
        return NextResponse.json({
            ...cached,
            meta: { ...cached.meta, cache_hit: true, latency_ms: Date.now() - start }
        });
    }

    // 2. Search Exa
    const exaCandidates = await searchExa(query, limit * 2); // Fetch more candidates

    // 3. Process with Stagehand (Top K)
    const k = Math.min(6, limit * 2);
    const candidatesToProcess = exaCandidates.slice(0, k);

    // Run Stagehand concurrently (limited by module semaphore)
    const stagehandResults = await Promise.all(
        candidatesToProcess.map(c => processWithStagehand(c.url))
    );

    // 4. Merge Results
    let results: ShopResult[] = [];

    // Add Stagehand results (validated inside module)
    stagehandResults.forEach(r => {
        if (r) results.push(r);
    });

    // Fallback: If Stagehand failed for some or we just need more, fill from Exa raw data
    // Convert remaining Exa candidates to minimal ShopResults if needed to reach 'limit'
    // Or just use what we have? The prompt says "Return a response; never throw". 
    // Let's ensure we return something if Stagehand fails entirely.
    if (results.length === 0 && exaCandidates.length > 0) {
        results = exaCandidates.slice(0, limit).map(c => validateShopResult({
            title: c.title,
            url: c.url,
            // Fallback image for raw Exa results
            image_url: null, // No fake images per user request
            evidence: [{ type: "exa", source: "exa", snippet: c.snippet }]
        }));
    }

    // 5. Rank
    const ranked = rankResults(results, query, budget);

    // 6. Build Response
    const response: ShopResponse = {
        query,
        currency: "USD",
        results: ranked.slice(0, limit),
        meta: {
            exa_candidates_considered: exaCandidates.length,
            stagehand_pages_opened: candidatesToProcess.length, // Attempted
            cache_hit: false,
            latency_ms: Date.now() - start,
        },
    };

    // 7. Cache & Return
    setCachedResult(cacheKey, response);

    return NextResponse.json(response);
}
