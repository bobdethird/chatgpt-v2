import { startSwarm } from "../lib/swarm/runner";
import { getSwarmBuffer, swarmBuffers } from "../lib/swarm/buffers";
import * as fs from 'fs';
import * as path from 'path';

// Load env vars manually to avoid dependencies
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} else {
    console.warn("Warning: .env.local not found at", envPath);
}

async function main() {
    const sessionId = "test-session-" + Date.now();
    const query = "Find the latest news about LangGraph Agentic workflows.";

    console.log(`Starting Swarm for session: ${sessionId}`);
    startSwarm(sessionId, query);

    // Poll for updates
    let attempts = 0;
    const maxAttempts = 20;

    const interval = setInterval(() => {
        attempts++;
        const buffer = getSwarmBuffer(sessionId);

        if (buffer) {
            console.log(`\n--- Status: ${buffer.status} ---`);
            console.log("Logs:", buffer.logs.slice(-3)); // Show last 3 logs
            console.log("Artifacts:", buffer.artifacts.length);

            if (buffer.status === 'completed' || buffer.status === 'failed') {
                clearInterval(interval);
                console.log("\nFinal Result:");
                console.log(JSON.stringify(buffer, null, 2));
            }
        } else {
            console.log("Buffer not found yet...");
        }

        if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.log("Timeout waiting for Swarm.");
        }
    }, 2000);
}

main();
