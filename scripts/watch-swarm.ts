/**
 * LIVE SWARM WATCHER
 * 
 * Rules:
 * 1. Requires the Next.js server to be running (`npm run dev`) at localhost:3000.
 * 2. Polls /api/debug/swarm every 1 second.
 * 3. Clears console and prints latest status.
 */

async function watchSwarm() {
    const url = "http://localhost:3000/api/debug/swarm";
    console.log(`Connecting to Swarm Monitor at ${url}...`);

    let lastLogCount = 0;

    while (true) {
        try {
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Server returned ${res.status}`);
            }
            const data = await res.json();

            console.clear();
            console.log("\x1b[36m%s\x1b[0m", "=== 🐝 GSD SWARM MONITOR (Heng Yang) ===");
            console.log(`Time: ${new Date().toLocaleTimeString()}`);
            console.log(`Status: \x1b[33m${data.status.toUpperCase()}\x1b[0m`);

            console.log("\n\x1b[32m--- LATEST ARTIFACTS (%d) ---\x1b[0m", data.artifacts?.length || 0);
            if (data.artifacts && data.artifacts.length > 0) {
                data.artifacts.slice(-3).forEach((a: any) => {
                    console.log(`[${a.type}] ${a.title} (${a.source})`);
                });
            } else {
                console.log("(No artifacts yet)");
            }

            console.log("\n\x1b[35m--- RECENT LOGS ---\x1b[0m");
            if (data.logs && data.logs.length > 0) {
                // Show last 10 logs
                data.logs.slice(-10).forEach((log: string) => {
                    console.log(log);
                });
            } else {
                console.log("(No logs yet)");
            }

        } catch (error: any) {
            console.clear();
            console.log("\x1b[31m%s\x1b[0m", "Connection Error:");
            console.log(`Could not reach ${url}`);
            console.log("Make sure 'npm run dev' is running in another terminal!");
        }

        // Wait 1s
        await new Promise(r => setTimeout(r, 1000));
    }
}

watchSwarm();
