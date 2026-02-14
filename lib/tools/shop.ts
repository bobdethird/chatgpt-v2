import { tool } from "ai";
import { z } from "zod";

export const searchProducts = tool({
    description: "Search for products to buy when the user explicitly wants to shop or find items for purchase. Returns the query parameters to render the shopping interface.",
    inputSchema: z.object({
        query: z.string().describe("The product search query (e.g. 'running shoes', 'red dress')."),
        budget: z.number().optional().describe("Optional maximum budget in dollars."),
    }),
    execute: async ({ query, budget }: { query: string; budget?: number }) => {
        // This tool is primarily a signal to render the ShoppingCanvas.
        // We return the params so the agent can use them in the UI spec.
        return {
            query,
            budget,
            action: "render_shopping_canvas",
        };
    },
});
