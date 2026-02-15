
import { z } from "zod";
import * as fs from 'fs';
import * as path from 'path';

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

// Import tool
import { stagehandActTool } from "../lib/swarm/tools";

async function runTest() {
    console.log("--- Testing Stagehand Structured Tool Call ---");

    // Mock a structured input that the LLM would generate
    const toolInput = {
        url: "https://example.com",
        action: "extract" as const, // or "act"
        instructions: "Extract the main heading of the page."
    };

    console.log("Input:", toolInput);

    try {
        // Invoke the tool directly (bypassing LangGraph for unit testing)
        const result = await stagehandActTool.invoke(toolInput);

        console.log("\nRaw Result:", result);

        // Verify Output Structure
        const parsed = JSON.parse(result);

        if (parsed.summary && parsed.items) {
            console.log("\n✅ SUCCESS: Tool returned valid structured JSON.");
            console.log("Summary:", parsed.summary);
        } else {
            console.error("\n❌ FAILURE: Output did not match expected schema.");
        }

    } catch (error: any) {
        console.error("\n❌ ERROR:", error.message);
        if (error.message.includes("BROWSERBASE")) {
            console.log("-> Tip: Ensure BROWSERBASE_API_KEY is set in .env.local");
        }
    }
}

runTest();
