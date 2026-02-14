import { ShopResult } from "./types";

export function rankResults(results: ShopResult[], query: string, budget?: number): ShopResult[] {
    // Simple ranking:
    // 1. Availability: In Stock > Unknown > Out of Stock
    // 2. Budget: If budget provided, filter/demote items over budget
    // 3. Price: Lower price (if under budget) slightly favored or just sort by relevance?
    //    Actually, Exa results are already ranked by relevance. We should preserve that order mostly,
    //    but bump up "in_stock" items or valid items over "unknown" ones.

    return results.sort((a, b) => {
        // 1. Availability
        const availabilityScore = (status: string) => {
            if (status === "in_stock") return 2;
            if (status === "unknown") return 1;
            return 0;
        };
        const scoreA = availabilityScore(a.availability);
        const scoreB = availabilityScore(b.availability);

        if (scoreA !== scoreB) return scoreB - scoreA; // Descending availability

        // 2. Budget (strict filter? or demotion?)
        // Let's just create a simple 'isWithinBudget' boolean if budget exists
        if (budget) {
            const aOk = a.price.amount !== null && a.price.amount <= budget;
            const bOk = b.price.amount !== null && b.price.amount <= budget;
            if (aOk && !bOk) return -1;
            if (!aOk && bOk) return 1;
        }

        // 3. Fallback to original order (which is usually preserved if sort returns 0)
        return 0;
    });
}
