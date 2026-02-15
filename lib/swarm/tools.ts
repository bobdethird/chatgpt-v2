/**
 * Tools for the Local Swarm (GSD Agent).
 * Wraps Exa (Search) and Stagehand (Browser Action).
 */
import Exa from "exa-js";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { appendSwarmLog } from "./buffers";
import { GoogleAuth } from "./google-auth";

// Initialize Exa
// Exa initialized lazily inside the tool

/**
 * Exa Search Tool
 * Best for high-quality "Deep Research" discovery.
 */
export const exaSearchTool = tool(
    async ({ query, category, num_results = 5 }: { query: string; category?: string; num_results?: number }, config) => {
        const sessionId = config.configurable?.sessionId;
        try {
            console.log(`[Swarm] Exa searching: ${query}`);
            if (sessionId) appendSwarmLog(sessionId, `Exa searching for: "${query}"`);

            const exa = new Exa(process.env.EXA_API_KEY || "skiploading");

            const result = await exa.searchAndContents(query, {
                type: "auto",
                numResults: num_results,
                category: category as any,
                contents: {
                    // text: false, // Omitted to avoid TS error, implies false if highlights is present
                    highlights: {
                        numSentences: 6,
                        query: query
                    },
                    extras: {
                        imageLinks: 3
                    }
                }
            });

            if (sessionId) appendSwarmLog(sessionId, `Exa found ${result.results.length} results.`);
            return JSON.stringify(result.results);
        } catch (e: any) {
            return `Error searching Exa: ${e.message}`;
        }
    },
    {
        name: "exa_search",
        description: "Perform a broad web search to find information, articles, or relevant URLs. Returns highlights and images. Use this to discover WHICH pages to visit.",
        schema: z.object({
            query: z.string().describe("The natural language search query"),
            category: z.enum(["company", "research paper", "news", "github", "tweet", "personal"]).optional().describe("Optional category to filter results"),
            num_results: z.number().optional().default(5).describe("Number of results to return"),
        }),
    }
);

/**
 * Stagehand Tool
 * Best for "Doing things" or "Extracting structured data" from specific URLs.
 * Connects to Browserbase for reliable execution.
 */
import { z as z3 } from "zod-v3"; // Import Zod v3 for Stagehand

export const stagehandActTool = tool(
    async ({ url, instruction }: { url?: string; instruction: string }, config) => {
        const sessionId = config.configurable?.sessionId;
        console.log(`[Swarm] Stagehand Agent starting: "${instruction}" ${url ? `on ${url}` : ''}`);
        if (sessionId) appendSwarmLog(sessionId, `Stagehand Browser starting task: "${instruction}"`);

        // Initialize Stagehand connected to Browserbase
        const stagehand = new Stagehand({
            env: "BROWSERBASE",
            apiKey: process.env.BROWSERBASE_API_KEY,
            projectId: process.env.BROWSERBASE_PROJECT_ID,
            verbose: 1,
            experimental: true, // Required for Hybrid and Streaming
            model: "openai/gpt-5-mini-2025-08-07", // Default model for Stagehand itself
            domSettleTimeoutMs: 500, // Reduced settle time for faster execution
        });

        try {
            await stagehand.init();
            console.log("[Swarm] Stagehand initialized.");

            // Cookie Import (if available)
            const listCookies = process.env.BROWSER_COOKIES;
            const page = stagehand.context.pages()[0];

            if (listCookies) {
                try {
                    const cookies = JSON.parse(listCookies);
                    await page.context().addCookies(cookies);
                    console.log(`[Swarm] Imported ${cookies.length} cookies.`);
                } catch (e) {
                    console.warn("[Swarm] Failed to parse cookies from env.");
                }
            }

            if (url) {
                console.log(`[Swarm] Navigating to ${url}...`);
                await page.goto(url);
            }

            // efficient autonomous execution
            const agent = stagehand.agent({
                model: "openai/gpt-5-mini-2025-08-07",
                mode: "dom",
                stream: false,   // Disable Streaming as requested
            });

            console.log(`[Swarm] Executing autonomous instruction...`);
            const result = await agent.execute({
                instruction: instruction,
                maxSteps: 20,
                callbacks: {
                    onStepFinish: (step) => {
                        // step is of type implicit here, but it contains action info
                        // We'll log the last action taken if available
                        // Inspecting the step object or just generic "Step taken"
                        // Based on Stagehand types, checking for action info
                        // We will try to be descriptive
                        // console.log("Step finished:", JSON.stringify(step)); // Debug
                        if (sessionId) {
                            // Try to extract meaningful log
                            // Common structure might be step.action or similar? 
                            // Let's just log that a step finished for now or check if we can get the action description
                            // "action" property in step?
                            // Cast to any to avoid TS issues if types aren't perfect
                            const s = step as any;
                            // Often there's 'action' or 'observation' or 'thought'
                            // Based on types seen in index.d.ts (AgentAction?), it might be in step.action (if it returns AgentAction?)
                            // Actually, onStepFinish passes something.
                            // Let's log a generic message with step count if possible, or just "Action performed."
                            appendSwarmLog(sessionId, `[Browser Step] Action completed.`);
                        }
                    }
                }
            });

            await stagehand.close();
            return JSON.stringify(result);

        } catch (e: any) {
            await stagehand.close();
            return `Error using Stagehand Agent: ${e.message}`;
        }
    },
    {
        name: "stagehand_browser",
        description: "A fully autonomous browser agent. Give it a high-level goal and optionally a starting URL. It will navigate, click, type, and extract information to achieve the goal.",
        schema: z.object({
            instruction: z.string().describe("The high-level goal or instruction for the agent (e.g. 'search for X and find the price')"),
            model_name: z.string().optional().describe("Model to use (default: gpt-5-mini-2025-08-07)"),
            url: z.string().optional().describe("Optional starting URL. If not provided, the agent will start at the current page or a default search engine if instructed."),
        }),
    }
);

/**
 * Google Service Tools
 */

export const gmailReadTool = tool(
    async ({ query = "is:unread" }: { query?: string }, config) => {
        const sessionId = config.configurable?.sessionId;
        try {
            if (sessionId) appendSwarmLog(sessionId, `Checking Gmail for: "${query}"`);
            const gmail = await GoogleAuth.getGmailClient();

            const list = await gmail.users.messages.list({ userId: "me", q: query, maxResults: 10 });
            if (!list.data.messages || list.data.messages.length === 0) {
                return "No emails found matching query.";
            }

            const messages = await Promise.all(list.data.messages.map(async (msg) => {
                const details = await gmail.users.messages.get({ userId: "me", id: msg.id! });
                const headers = details.data.payload?.headers;
                const subject = headers?.find(h => h.name === "Subject")?.value || "(No Subject)";
                const from = headers?.find(h => h.name === "From")?.value || "(Unknown)";
                const snippet = details.data.snippet;
                return { from, subject, snippet, date: headers?.find(h => h.name === "Date")?.value };
            }));

            if (sessionId) appendSwarmLog(sessionId, `Found ${messages.length} emails.`);
            return JSON.stringify(messages);
        } catch (e: any) {
            return `Error reading Gmail: ${e.message}`;
        }
    },
    {
        name: "gmail_read",
        description: "Read emails from Gmail. Use queries like 'is:unread', 'from:boss', or 'subject:meeting'. Returns a list of email summaries.",
        schema: z.object({
            query: z.string().optional().describe("Gmail search query (default: is:unread)"),
        }),
    }
);

export const gmailSendTool = tool(
    async ({ to, subject, body }: { to: string; subject: string; body: string }, config) => {
        const sessionId = config.configurable?.sessionId;
        try {
            if (sessionId) appendSwarmLog(sessionId, `Sending email to ${to}...`);
            const gmail = await GoogleAuth.getGmailClient();

            const message = [
                `To: ${to}`,
                `Subject: ${subject}`,
                `Content-Type: text/plain; charset=utf-8`,
                ``,
                body
            ].join("\n");

            const encodedMessage = Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

            await gmail.users.messages.send({
                userId: "me",
                requestBody: { raw: encodedMessage }
            });

            if (sessionId) appendSwarmLog(sessionId, `Email sent successfully to ${to}.`);
            return `Email sent to ${to}`;
        } catch (e: any) {
            return `Error sending email: ${e.message}`;
        }
    },
    {
        name: "gmail_send",
        description: "Send an email. To attach a file, include its Google Drive Link in the body.",
        schema: z.object({
            to: z.string().describe("Recipient email address"),
            subject: z.string().describe("Email subject"),
            body: z.string().describe("Email body content. Include Drive links here if needed."),
        }),
    }
);

export const calendarListTool = tool(
    async ({ maxResults = 10 }: { maxResults?: number }, config) => {
        const sessionId = config.configurable?.sessionId;
        try {
            const calendar = await GoogleAuth.getCalendarClient();
            const res = await calendar.events.list({
                calendarId: "primary",
                timeMin: new Date().toISOString(),
                maxResults: maxResults,
                singleEvents: true,
                orderBy: "startTime",
            });
            const events = res.data.items?.map(event => ({
                summary: event.summary,
                start: event.start?.dateTime || event.start?.date,
                link: event.htmlLink
            }));
            return JSON.stringify(events || []);
        } catch (e: any) {
            return `Error listing calendar events: ${e.message}`;
        }
    },
    {
        name: "calendar_list",
        description: "List upcoming calendar events.",
        schema: z.object({
            maxResults: z.number().optional().default(10).describe("Max number of events to list"),
        }),
    }
);

export const calendarEventCreateTool = tool(
    async ({ summary, startTime, endTime, description }: { summary: string; startTime: string; endTime: string; description?: string }, config) => {
        const sessionId = config.configurable?.sessionId;
        try {
            const calendar = await GoogleAuth.getCalendarClient();
            const event = {
                summary,
                description,
                start: { dateTime: startTime },
                end: { dateTime: endTime },
            };
            const res = await calendar.events.insert({
                calendarId: "primary",
                requestBody: event,
            });
            if (sessionId) appendSwarmLog(sessionId, `Created calendar event: ${summary}`);
            return `Event created: ${res.data.htmlLink}`;
        } catch (e: any) {
            return `Error creating event: ${e.message}`;
        }
    },
    {
        name: "calendar_create_event",
        description: "Create a new event on the primary calendar.",
        schema: z.object({
            summary: z.string().describe("Event title"),
            startTime: z.string().describe("Start time in ISO format (e.g. 2024-01-01T10:00:00Z)"),
            endTime: z.string().describe("End time in ISO format"),
            description: z.string().optional().describe("Event description"),
        }),
    }
);

export const driveSearchTool = tool(
    async ({ query, limit = 10 }: { query: string; limit?: number }, config) => {
        const sessionId = config.configurable?.sessionId;
        try {
            if (sessionId) appendSwarmLog(sessionId, `Searching Drive for: "${query}"`);
            const drive = await GoogleAuth.getDriveClient();

            // Search name containing query, not trashed
            const q = `name contains '${query}' and trashed = false`;
            const res = await drive.files.list({
                q,
                pageSize: limit,
                orderBy: "modifiedTime desc",
                fields: "files(id, name, webViewLink, mimeType, modifiedTime)"
            });

            if (sessionId) appendSwarmLog(sessionId, `Found ${res.data.files?.length || 0} files.`);
            return JSON.stringify(res.data.files);
        } catch (e: any) {
            return `Error searching Drive: ${e.message}`;
        }
    },
    {
        name: "drive_search",
        description: "Search for files in Google Drive. Returns file names, IDs, and shareable webViewLinks.",
        schema: z.object({
            query: z.string().describe("Search query for file name (e.g. 'project proposal')"),
            limit: z.number().optional().default(10),
        }),
    }
);

export const driveReadTool = tool(
    async ({ fileId }: { fileId: string }, config) => {
        const sessionId = config.configurable?.sessionId;
        try {
            const drive = await GoogleAuth.getDriveClient();

            // First get metadata to check mimeType
            const meta = await drive.files.get({ fileId, fields: "name, mimeType" });
            const mimeType = meta.data.mimeType;

            let content: string = "";

            if (mimeType === "application/vnd.google-apps.document") {
                // Export Google Doc to text
                if (sessionId) appendSwarmLog(sessionId, `Exporting Google Doc: ${meta.data.name}`);
                const res = await drive.files.export({
                    fileId,
                    mimeType: "text/plain",
                });
                content = res.data as string;
            } else {
                // Try to read generic file as text
                if (sessionId) appendSwarmLog(sessionId, `Reading file: ${meta.data.name}`);
                const res = await drive.files.get({
                    fileId,
                    alt: "media"
                }, { responseType: "text" }); // Force text response
                content = res.data as string;
            }

            return `File Content (${meta.data.name}):\n\n${content.slice(0, 5000)}... (truncated if long)`;
        } catch (e: any) {
            return `Error reading file: ${e.message}. Note: Binary files cannot be read as text.`;
        }
    },
    {
        name: "drive_read",
        description: "Read the content of a file. Supports Google Docs (auto-export to text) and plain text files.",
        schema: z.object({
            fileId: z.string().describe("The ID of the file to read"),
        }),
    }
);
