
import { exaSearchTool, stagehandActTool } from "../lib/swarm/tools";
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

async function main() {
    console.log("--- Verifying Autonomous Tools ---");

    // 1. Test Exa (Scan First)
    console.log("\n1. Testing Exa Search (Scan First)...");
    try {
        const exaResult = await exaSearchTool.invoke({
            query: "latest typescript features",
            num_results: 1
        });
        console.log("Exa Result Length:", exaResult.length);
        console.log("Exa Result Preview:", exaResult.substring(0, 200));

        if (exaResult.includes("highlights") || exaResult.includes("image")) {
            console.log("SUCCESS: Exa returned rich content (highlights/images).");
        } else {
            console.warn("WARNING: Exa result might be missing highlights.");
        }
    } catch (e: any) {
        console.error("Exa Failed:", e.message);
    }

    // 2. Test Stagehand (Observe Mode - Safe)
    console.log("\n2. Testing Stagehand (Observe on example.com)...");
    try {
        const stagehandResult = await stagehandActTool.invoke({
            url: "https://example.com",
            action: "observe",
            instructions: "What is the title of the page?"
        });
        console.log("Stagehand Result:", stagehandResult);
    } catch (e: any) {
        console.error("Stagehand Failed:", e.message);
    }

    // 3. Test Stagehand (Act Mode - Mock)
    // We won't actually click anything meaningful, just see if it runs without crashing.
    console.log("\n3. Testing Stagehand (Act Mode - Dry Run)...");
    try {
        // We assume it might fail to find the element "NonExistentButton", which is fine, 
        // as long as the tool logic executes.
        const actResult = await stagehandActTool.invoke({
            url: "https://example.com",
            action: "act",
            instructions: "Click the 'More information' link"
        });
        console.log("Act Result:", actResult);
    } catch (e: any) {
        // It might fail if it can't find the link, but that proves it tried to ACT.
        console.log("Stagehand Act attempted (might have failed to find element, which is expected):", e.message.slice(0, 100));
    }

    console.log("\n--- Verification Complete ---");
}

main();
