import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
const TOKENS_PATH = path.join(process.cwd(), "lib/swarm/tokens.json");

export class GoogleAuth {
    private static oauth2Client: any = null;

    private static async getOAuth2Client() {
        if (this.oauth2Client) return this.oauth2Client;

        if (!fs.existsSync(CREDENTIALS_PATH)) {
            throw new Error("credentials.json not found. Please run the setup script.");
        }
        if (!fs.existsSync(TOKENS_PATH)) {
            throw new Error("tokens.json not found. Please run the setup script.");
        }

        const keys = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
        const clientKeys = keys.installed || keys.web;

        const client = new google.auth.OAuth2(
            clientKeys.client_id,
            clientKeys.client_secret,
            "http://localhost:3000/oauth2callback"
        );

        const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, "utf-8"));
        client.setCredentials(tokens);

        // Handle token refresh automatically
        client.on("tokens", (freshTokens) => {
            if (freshTokens.refresh_token) {
                tokens.refresh_token = freshTokens.refresh_token;
            }
            tokens.access_token = freshTokens.access_token;
            tokens.expiry_date = freshTokens.expiry_date;
            fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
        });

        this.oauth2Client = client;
        return client;
    }

    static async getGmailClient() {
        const auth = await this.getOAuth2Client();
        return google.gmail({ version: "v1", auth });
    }

    static async getCalendarClient() {
        const auth = await this.getOAuth2Client();
        return google.calendar({ version: "v3", auth });
    }

    static async getDriveClient() {
        const auth = await this.getOAuth2Client();
        return google.drive({ version: "v3", auth });
    }
}
