
import { swarmGraph } from "../lib/swarm/graph";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const QUERY = process.argv[2] || "Reply to Lebron James' email; ask him how his day was.";

async function main() {
    const sessionId = uuidv4();
    console.log(`[Verify] Starting session: ${sessionId}`);
    console.log(`[Verify] Query: ${QUERY}`);

    const inputs = {
        messages: [{ role: "user", content: QUERY }],
        sessionId,
    };

    const config = { configurable: { sessionId } };

    try {
        const stream = await swarmGraph.stream(inputs, config);

        for await (const chunk of stream) {
            const nodeName = Object.keys(chunk)[0];
            const messages = chunk[nodeName]?.messages;
            if (messages && messages.length > 0) {
                const lastMsg = messages[messages.length - 1];
                if (lastMsg.content) {
                    console.log(`[${nodeName.toUpperCase()}] ${lastMsg.content}`);
                }
                if (lastMsg.tool_calls) {
                    for (const tc of lastMsg.tool_calls) {
                        console.log(`[${nodeName.toUpperCase()}] Tool Call: ${tc.name} args: ${JSON.stringify(tc.args)}`);
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error running verification:", e);
    }
}

main();
