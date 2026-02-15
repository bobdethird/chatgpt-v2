
import { HumanMessage } from "@langchain/core/messages";
import * as fs from 'fs';
import * as path from 'path';
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function main() {
    console.log("--- Minimal Agent Example ---");

    // 1. Dynamic Imports (to ensure env vars are loaded)
    const { swarmGraph } = await import("./lib/swarm/graph");
    const { initSwarmBuffer, getSwarmBuffer } = await import("./lib/swarm/buffers");

    // 2. Setup Session
    const sessionId = "example-session-" + Date.now();
    console.log(`Session ID: ${sessionId}`);

    // 3. Initialize Buffer (Crucial for capturing logs/artifacts)
    initSwarmBuffer(sessionId);

    // 4. Define Query
    const userQuery = "Find the MPS sparse library plan in my drive and tell me about it. Then email the plan to Lebron James (goated@berkeley.edu). I also need to schedule a meeting with him for 10am on Monday; beforehand, he needs to procure a macbook, so also send an amazon link for a macbook pro to him. Search on amazon to determine if it's in stock and if it's available for same day delivery (send to him).";
    console.log(`Query: "${userQuery}"`);

    try {
        // 5. Run Agent
        console.log("Agent running...");
        const result = await swarmGraph.invoke(
            {
                messages: [new HumanMessage(userQuery)],
                sessionId: sessionId
            },
            {
                configurable: { sessionId }
            }
        );

        console.log("--- Agent Finished ---");

        // 6. Inspect Buffer (Logs & Artifacts)
        const buffer = getSwarmBuffer(sessionId);
        if (buffer) {
            console.log("\n[LOGS]");
            buffer.logs.forEach(log => console.log(log));

            console.log("\n[ARTIFACTS]");
            buffer.artifacts.forEach(art => {
                console.log(`- ${art.title} (${art.type})`);
                console.log(`  Source: ${art.source}`);
                console.log(`  Content: ${JSON.stringify(art.content).slice(0, 100)}...`);
            });
        }

        // 7. Final Response
        const lastMsg = result.messages[result.messages.length - 1];
        console.log("\n[FINAL RESPONSE]");
        console.log(lastMsg.content);

    } catch (error) {
        console.error("Error:", error);
    }
}

main();
