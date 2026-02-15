import { chromium } from 'playwright';
import fs from 'fs';

/**
 * Helper script to get cookies for Stagehand.
 * Usage: npx tsx scripts/get-cookies.ts
 */
(async () => {
    console.log("Launching browser to capture cookies...");
    console.log("Please login to the sites you want the agent to access (e.g. Amazon, GitHub).");
    console.log("Close the browser when you are done.");

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://google.com'); // Start somewhere

    // Wait for browser to close
    browser.on('disconnected', async () => {
        console.log("Browser closed. Saving cookies...");
        const cookies = await context.cookies();
        fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));
        console.log(`Saved ${cookies.length} cookies to cookies.json`);
        console.log("Set BROWSER_COOKIES=$(cat cookies.json) or load it in your app.");
    });

    // Keep script running until user closes browser
    await new Promise(() => { });
})();
