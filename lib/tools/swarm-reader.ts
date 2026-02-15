import { tool } from "ai";
import { z } from "zod";
import { getSwarmBuffer } from "../swarm/buffers";

// We need a way to pass the sessionId to the tool. 
// 'ai' SDK tools don't inherently know about the request context/sessionId unless we pass it.
// OPTION A: The tool expects sessionId as an argument (LLM must know it? No, LLM doesn't know sessionId).
// OPTION B: We create the tool *inside* the route handler where we have the sessionId, closing over it.
// OPTION C: We rely on a global or context store (Next.js request context).

// Going with OPTION B (Factory Pattern) implies we need to change how tools are defined in agent.ts.
// But agent.ts currently exports a static `agent` object.
// We might need to refactor `agent.ts` to export a function `createAgent(sessionId: string)`.

// OR for this Hackathon:
// The LLM can just query "current_session". 
// Actually, the `tool` definition can't easily access closure state if defined statically.

// LET'S REFACTOR `lib/agent.ts` slightly to accept tools or be a factory?
// Alternatively: Pass sessionId as a "hidden" argument injected by the system? No.

// SIMPLEST HACKATHON FIX:
// Just export a factory function for this specific tool.
// And in the route, we'll instantiate the agent with this specific tool instance.

export const createSwarmReaderTool = (sessionId: string) => tool({
    description: "Retrieve the latest status, logs, and gathered artifacts from the background 'Get Stuff Done' (GSD) Swarm.",
    inputSchema: z.object({}),
    execute: async () => {
        const buffer = getSwarmBuffer(sessionId);

        if (!buffer) {
            return { status: "not_started", message: "Swarm has not been initialized for this session." };
        }

        return {
            status: buffer.status,
            logs: buffer.logs.slice(-10), // Return last 10 logs to avoid token limit bloat
            artifacts_count: buffer.artifacts.length,
            artifacts_summary: buffer.artifacts.map(a => ({ title: a.title, type: a.type, source: a.source })),
            // We assume the Agent will ask for specific artifacts if needed, or we just dump them?
            // Let's dump the actual content of the last 3 artifacts.
            latest_artifacts: buffer.artifacts.slice(-3)
        };
    },
});
