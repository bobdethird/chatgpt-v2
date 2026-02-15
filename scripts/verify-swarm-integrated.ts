
// import { swarmGraph } from "../lib/swarm/graph";
// import { initSwarmBuffer, getSwarmBuffer } from "../lib/swarm/buffers";
import { HumanMessage } from "@langchain/core/messages";
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

// Force direct OpenAI connection by unsetting Base URL if present
// This avoids the OIDC error if .env.local contains the Vercel Gateway URL
if (process.env.OPENAI_BASE_URL && process.env.OPENAI_BASE_URL.includes("vercel")) {
    console.log("Removing Vercel AI Gateway Base URL to force direct OpenAI connection for local test.");
    delete process.env.OPENAI_BASE_URL;
}

async function runIntegratedTest() {
    console.log("--- Starting Integrated Swarm Test ---");

    // Dynamic Import to ensure Env Vars are ready
    const { swarmGraph } = await import("../lib/swarm/graph");
    const { initSwarmBuffer, getSwarmBuffer } = await import("../lib/swarm/buffers");

    // 1. Setup Session
    const sessionId = "test-session-" + Date.now();
    console.log(`Session ID: ${sessionId}`);

    // Initialize Buffer (Crucial!)
    initSwarmBuffer(sessionId);

    // 2. Define Goal
    // A query that requires Search -> Visit
    const userQuery = "find the best wireless noise canceling headphones under $200 and give me the amazon link";
    console.log(`User Query: "${userQuery}"`);

    try {
        // 3. Run Graph
        console.log("Invoking Swarm Graph...");
        const result = await swarmGraph.invoke(
            {
                messages: [new HumanMessage(userQuery)],
                sessionId: sessionId
            },
            {
                configurable: { thread_id: sessionId }
            }
        );

        console.log("\n--- Execution Finished ---");

        // 4. Inspect State/Buffer
        const buffer = getSwarmBuffer(sessionId);

        if (!buffer) {
            console.error("❌ Error: Buffer not found for session!");
            return;
        }

        console.log(`\nStatus: ${buffer.status}`);

        console.log("\n--- Logs ---");
        buffer.logs.forEach(log => console.log(log));

        console.log("\n--- Artifacts ---");
        if (buffer.artifacts.length === 0) {
            console.log("No artifacts produced.");
        } else {
            buffer.artifacts.forEach((art, i) => {
                console.log(`\n[Artifact ${i + 1}] ${art.title} (${art.type})`);
                console.log(`Source: ${art.source}`);
                // Print a snippet of content
                const contentStr = JSON.stringify(art.content, null, 2);
                console.log(`Content: ${contentStr.slice(0, 300)}...`);
            });
        }

        console.log("\n--- Final Agent Response ---");
        const lastMsg = result.messages[result.messages.length - 1];
        console.log(lastMsg.content);

    } catch (error: any) {
        console.error("\n❌ ERROR:", error);
    }
}

runIntegratedTest();
