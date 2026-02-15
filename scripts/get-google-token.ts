import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import open from "open";
import * as http from "http";
import * as url from "url";

// Configuration
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
const TOKENS_PATH = path.join(process.cwd(), "lib/swarm/tokens.json"); // Store in lib/swarm for easy access
const SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive.readonly", // For searching/reading
    "https://www.googleapis.com/auth/drive" // Full access just in case
];

async function main() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error(`Error: credentials.json not found at ${CREDENTIALS_PATH}`);
        console.error("Please download it from Google Cloud Console and place it in the root directory.");
        process.exit(1);
    }

    const content = fs.readFileSync(CREDENTIALS_PATH, "utf-8");
    const credentials = JSON.parse(content);

    // Support both "installed" (desktop) and "web" formats
    const keys = credentials.installed || credentials.web;
    if (!keys) {
        console.error("Error: Invalid credentials.json format. Missing 'installed' or 'web' property.");
        process.exit(1);
    }

    const oauth2Client = new google.auth.OAuth2(
        keys.client_id,
        keys.client_secret,
        "http://localhost:3000/oauth2callback" // Temporary redirect URI for this script
    );

    // Generate Auth URL
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline", // Essential for refresh token
        scope: SCOPES,
        prompt: 'consent' // Force refresh token generation
    });

    console.log("Authorize this app by visiting this url:", authUrl);
    await open(authUrl);

    // Create a temporary server to catch the callback
    const server = http.createServer(async (req, res) => {
        try {
            if (req.url!.indexOf("/oauth2callback") > -1) {
                const qs = new url.URL(req.url!, "http://localhost:3000").searchParams;
                const code = qs.get("code");

                res.end("Authentication successful! You can close this tab and check your terminal.");
                server.close();

                if (code) {
                    const { tokens } = await oauth2Client.getToken(code);

                    // Create directory if not exists
                    const dir = path.dirname(TOKENS_PATH);
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                    }

                    fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
                    console.log(`Tokens saved to ${TOKENS_PATH}`);
                    console.log("Setup complete! You can now run the agent.");
                }
            }
        } catch (e) {
            console.error("Error retrieving access token", e);
            res.end("Error retrieving access token");
            server.close();
        }
    });

    server.listen(3000, () => {
        console.log("Listening on port 3000 for OAuth callback...");
    });
}

main().catch(console.error);
