import { startSwarm } from "../lib/swarm/runner";
import { getSwarmBuffer } from "../lib/swarm/buffers";
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

async function verifyIntegratedSwarm() {
    console.log("1. Starting Swarm for 'demo-heng-yang'...");
    // This should internaly force 'demo-heng-yang'
    startSwarm("any-session-id", "Find the current price of Bitcoin");

    console.log("2. Waiting for Swarm to think (5s)...");
    await new Promise(r => setTimeout(r, 5000));

    console.log("3. Checking Swarm Buffer for 'demo-heng-yang'...");
    const buffer = getSwarmBuffer("demo-heng-yang");

    if (buffer) {
        console.log("✅ Buffer found for FIXED session ID.");
        console.log("Status:", buffer.status);
        console.log("Logs:", buffer.logs.length, "entries");
        console.log("Recent Log:", buffer.logs[buffer.logs.length - 1]);

        if (buffer.logs.some(l => l.includes("Bitcoin"))) {
            console.log("✅ Log content confirms checking Bitcoin.");
        } else {
            console.log("⚠️ Logs do not explicitly mention Bitcoin yet (might be early).");
        }
    } else {
        console.error("❌ NO BUFFER found for 'demo-heng-yang'. Session forcing failed in runner.ts?");
    }
}

verifyIntegratedSwarm();
