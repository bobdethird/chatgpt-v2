import { startSwarm } from "../lib/swarm/runner";
import { createSwarmReaderTool } from "../lib/tools/swarm-reader";
import { getSwarmBuffer } from "../lib/swarm/buffers";
import * as fs from 'fs';
import * as path from 'path';

// Load env vars manually from .env.local
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
if (process.env.OPENAI_BASE_URL && process.env.OPENAI_BASE_URL.includes("vercel")) {
    console.log("Removing Vercel AI Gateway Base URL to force direct OpenAI connection for local test.");
    delete process.env.OPENAI_BASE_URL;
}

async function main() {
    const sessionId = "test-reader-" + Math.random().toString(36).substring(7);
    const query = "What is the price of Sony WH-1000XM5 on Amazon?";

    console.log(`[Test] Starting swarm for session: ${sessionId}`);
    startSwarm(sessionId, query);

    const readerTool = createSwarmReaderTool(sessionId);

    console.log("[Test] Entering polling loop (every 1s)...");

    // Poll for updates more frequently
    for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log(`\n--- Poll ${i + 1} ---`);
        const result = await (readerTool as any).execute({});

        console.log("Status:", result.status);
        console.log("Latest Logs:", result.logs);
        console.log("Artifacts Count:", result.artifacts_count);

        if (result.artifacts_summary.length > 0) {
            console.log("Artifacts Summary:", JSON.stringify(result.artifacts_summary, null, 2));
            if (result.latest_artifacts && result.latest_artifacts.length > 0) {
                console.log("Latest Artifacts Content Preview:", JSON.stringify(result.latest_artifacts, null, 2).substring(0, 500) + "...");
            }
        }

        if (result.status === 'completed' || result.status === 'failed') {
            console.log(`[Test] Swarm finished with status: ${result.status}`);
            break;
        }
    }

    const finalBuffer = getSwarmBuffer(sessionId);
    console.log(`\n[Test] Final buffer summary:`);
    console.log(`Total Logs: ${finalBuffer?.logs.length}`);
    console.log(`Total Artifacts: ${finalBuffer?.artifacts.length}`);
}

main().catch(console.error);
