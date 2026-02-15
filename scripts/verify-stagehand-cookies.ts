import { Stagehand } from "@browserbasehq/stagehand";
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

async function main() {
    console.log("Starting Stagehand Cookie Verification...");

    // 1. Load Cookies
    const cookiePath = path.resolve(process.cwd(), 'cookies.json');
    if (!fs.existsSync(cookiePath)) {
        console.error(`\n❌ Error: 'cookies.json' not found at ${cookiePath}`);
        console.error("Please run 'npx tsx scripts/get-cookies.ts' first and log in to the target site.");
        process.exit(1);
    }

    let cookies;
    try {
        const cookiesRaw = fs.readFileSync(cookiePath, 'utf-8');
        cookies = JSON.parse(cookiesRaw);
        console.log(`✅ Loaded ${cookies.length} cookies from cookies.json`);
    } catch (e) {
        console.error("❌ Failed to parse cookies.json:", e);
        process.exit(1);
    }

    // 2. Initialize Stagehand
    console.log("Initializing Stagehand...");
    const stagehand = new Stagehand({
        env: "BROWSERBASE",
        verbose: 1,
        // debugDom: true, // Optional, might not be in types depending on version
    });

    await stagehand.init();
    const page = stagehand.page;

    // 3. Set Cookies
    console.log("Injected cookies into browser context.");
    await page.context().addCookies(cookies);

    // 4. Verification Step - Using the Agent pattern
    const targetUrl = 'https://github.com/';
    console.log(`Navigating to ${targetUrl} to verify authentication state...`);
    await page.goto(targetUrl);

    const action = "Check if I am logged in. Look for my username or a 'Sign In' button. If logged in, return my username.";
    console.log(`Running Stagehand Agent action: "${action}"`);

    const agent = stagehand.agent({
        model: "gpt-4o", // or "gpt-5-mini-2025-08-07" if available/preferred
        mode: "dom",
    });

    const result = await agent.execute({
        instruction: action,
    });

    console.log("\n--- Verification Result ---");
    console.log(result);

    await stagehand.close();
}

main().catch(console.error);
