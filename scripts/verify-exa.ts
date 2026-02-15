
import { exaSearchTool } from "../lib/swarm/tools";
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

async function runTest() {
    console.log("--- Testing Exa Search Tool (Scan First) ---");

    const query = "latest typescript features";
    console.log(`Query: "${query}"`);

    try {
        const resultJson = await exaSearchTool.invoke({
            query: query,
            num_results: 3,
            category: "news"
        });

        // Parse result
        const results = JSON.parse(resultJson);
        console.log(`\nFound ${results.length} results.`);

        if (results.length > 0) {
            const first = results[0];
            console.log("\nFirst Result Preview:");
            console.log("Title:", first.title);
            console.log("URL:", first.url);

            // Verify 'Scan First' fields
            if (first.highlights) {
                console.log("✅ Highligts present (Length):", first.highlights.length);
                console.log("   Snippet:", first.highlights[0]?.slice(0, 100) + "...");
            } else {
                console.warn("❌ WARNING: No highlights found. Check tool config.");
            }

            if (first.image) {
                console.log("✅ Image URL present:", first.image);
            } else {
                console.log("ℹ️ Note: No image found for this result (might be expected).");
            }

        } else {
            console.error("❌ No results found.");
        }

    } catch (error: any) {
        console.error("\n❌ ERROR:", error.message);
        if (error.message.includes("EXA_API_KEY")) {
            console.log("-> Tip: Ensure EXA_API_KEY is set in .env.local");
        }
    }
}

runTest();
