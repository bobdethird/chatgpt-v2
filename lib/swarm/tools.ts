/**
 * Tools for the Local Swarm (GSD Agent).
 * Wraps Exa (Search) and Stagehand (Browser Action).
 */
import Exa from "exa-js";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { appendSwarmLog } from "./buffers";

// Initialize Exa
// Exa initialized lazily inside the tool

/**
 * Exa Search Tool
 * Best for high-quality "Deep Research" discovery.
 */
export const exaSearchTool = tool(
    async ({ query, category, num_results = 5 }: { query: string; category?: string; num_results?: number }, config) => {
        const sessionId = config.configurable?.sessionId;
        try {
            console.log(`[Swarm] Exa searching: ${query}`);
            if (sessionId) appendSwarmLog(sessionId, `Exa searching for: "${query}"`);

            const exa = new Exa(process.env.EXA_API_KEY || "skiploading");

            const result = await exa.searchAndContents(query, {
                type: "auto",
                numResults: num_results,
                category: category as any,
                contents: {
                    // text: false, // Omitted to avoid TS error, implies false if highlights is present
                    highlights: {
                        numSentences: 6,
                        query: query
                    },
                    extras: {
                        imageLinks: 3
                    }
                }
            });

            if (sessionId) appendSwarmLog(sessionId, `Exa found ${result.results.length} results.`);
            return JSON.stringify(result.results);
        } catch (e: any) {
            return `Error searching Exa: ${e.message}`;
        }
    },
    {
        name: "exa_search",
        description: "Perform a broad web search to find information, articles, or relevant URLs. Returns highlights and images. Use this to discover WHICH pages to visit.",
        schema: z.object({
            query: z.string().describe("The natural language search query"),
            category: z.enum(["company", "research paper", "news", "github", "tweet", "personal"]).optional().describe("Optional category to filter results"),
            num_results: z.number().optional().default(5).describe("Number of results to return"),
        }),
    }
);

/**
 * Stagehand Tool
 * Best for "Doing things" or "Extracting structured data" from specific URLs.
 * Connects to Browserbase for reliable execution.
 */
import { z as z3 } from "zod-v3"; // Import Zod v3 for Stagehand

export const stagehandActTool = tool(
    async ({ url, instruction }: { url?: string; instruction: string }, config) => {
        const sessionId = config.configurable?.sessionId;
        console.log(`[Swarm] Stagehand Agent starting: "${instruction}" ${url ? `on ${url}` : ''}`);
        if (sessionId) appendSwarmLog(sessionId, `Stagehand Browser starting task: "${instruction}"`);

        // Initialize Stagehand connected to Browserbase
        const stagehand = new Stagehand({
            env: "BROWSERBASE",
            apiKey: process.env.BROWSERBASE_API_KEY,
            projectId: process.env.BROWSERBASE_PROJECT_ID,
            verbose: 1,
            experimental: true, // Required for Hybrid and Streaming
            model: "openai/gpt-5-mini-2025-08-07", // Default model for Stagehand itself
            domSettleTimeoutMs: 500, // Reduced settle time for faster execution
        });

        try {
            await stagehand.init();
            console.log("[Swarm] Stagehand initialized.");

            // Cookie Import (if available)
            const listCookies = process.env.BROWSER_COOKIES;
            const page = stagehand.context.pages()[0];

            if (listCookies) {
                try {
                    const cookies = JSON.parse(listCookies);
                    await page.context().addCookies(cookies);
                    console.log(`[Swarm] Imported ${cookies.length} cookies.`);
                } catch (e) {
                    console.warn("[Swarm] Failed to parse cookies from env.");
                }
            }

            if (url) {
                console.log(`[Swarm] Navigating to ${url}...`);
                await page.goto(url);
            }

            // efficient autonomous execution
            const agent = stagehand.agent({
                model: "openai/gpt-5-mini-2025-08-07",
                mode: "dom",
                stream: false,   // Disable Streaming as requested
            });

            console.log(`[Swarm] Executing autonomous instruction...`);
            const result = await agent.execute({
                instruction: instruction,
                maxSteps: 20,
                callbacks: {
                    onStepFinish: (step) => {
                        // step is of type implicit here, but it contains action info
                        // We'll log the last action taken if available
                        // Inspecting the step object or just generic "Step taken"
                        // Based on Stagehand types, checking for action info
                        // We will try to be descriptive
                        // console.log("Step finished:", JSON.stringify(step)); // Debug
                        if (sessionId) {
                            // Try to extract meaningful log
                            // Common structure might be step.action or similar? 
                            // Let's just log that a step finished for now or check if we can get the action description
                            // "action" property in step?
                            // Cast to any to avoid TS issues if types aren't perfect
                            const s = step as any;
                            // Often there's 'action' or 'observation' or 'thought'
                            // Based on types seen in index.d.ts (AgentAction?), it might be in step.action (if it returns AgentAction?)
                            // Actually, onStepFinish passes something.
                            // Let's log a generic message with step count if possible, or just "Action performed."
                            appendSwarmLog(sessionId, `[Browser Step] Action completed.`);
                        }
                    }
                }
            });

            await stagehand.close();
            return JSON.stringify(result);

        } catch (e: any) {
            await stagehand.close();
            return `Error using Stagehand Agent: ${e.message}`;
        }
    },
    {
        name: "stagehand_browser",
        description: "A fully autonomous browser agent. Give it a high-level goal and optionally a starting URL. It will navigate, click, type, and extract information to achieve the goal.",
        schema: z.object({
            instruction: z.string().describe("The high-level goal or instruction for the agent (e.g. 'search for X and find the price')"),
            model_name: z.string().optional().describe("Model to use (default: gpt-5-mini-2025-08-07)"),
            url: z.string().optional().describe("Optional starting URL. If not provided, the agent will start at the current page or a default search engine if instructed."),
        }),
    }
);
