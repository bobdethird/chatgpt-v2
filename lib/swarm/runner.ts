import { swarmGraph } from "./graph";
import { initSwarmBuffer, setSwarmStatus, appendSwarmLog, getSwarmBuffer } from "./buffers";
import { HumanMessage, BaseMessage } from "@langchain/core/messages";

// Simple in-memory history for the hackathon "Single Swarm"
// Map<sessionId, BaseMessage[]>
const sessionHistories = new Map<string, BaseMessage[]>();

/**
 * Fire-and-forget runner for the Swarm.
 * This function returns immediately after starting the graph execution in the background.
 */
export function startSwarm(sessionId: string, query: string) {

    // FORCE SINGLE SESSION for this demo
    const FIXED_SESSION_ID = "demo-heng-yang";
    sessionId = FIXED_SESSION_ID;

    // 1. Initialize or Update Buffer
    let buffer = getSwarmBuffer(sessionId);
    if (!buffer) {
        initSwarmBuffer(sessionId);
        buffer = getSwarmBuffer(sessionId);
    }

    setSwarmStatus(sessionId, "running");
    appendSwarmLog(sessionId, `[USER REQUEST] "${query}"`);

    // 2. Manage History
    let history = sessionHistories.get(sessionId) || [];
    const newMessage = new HumanMessage(query);
    history.push(newMessage);
    sessionHistories.set(sessionId, history);

    // 3. Start Execution (Fire & Forget)
    (async () => {
        try {
            // We pass the FULL history + new message to the graph
            // Since we're not using a real checkpointer, we simulate state by passing all messages.
            // The graph's 'messages' annotation is append-only reducer, so passing a big list *might* duplicate
            // if we re-used a checkpointer. But here we are effectively "restarting" the graph with full context.
            // CAUTION: Tooloutputs from previous runs aren't in 'history' unless we captured them.
            // For this simpler version, we just pass the NEW message, but we lose context of previous tool calls 
            // unless we store them too.

            // BETTER HACK: Just pass the new message? 
            // If the graph is stateless, it won't know previous context.
            // Let's pass the full history.

            const inputs = {
                messages: [newMessage], // Passing just new message for now to avoid huge payload duplication in this stateless run
                sessionId: sessionId,
            };

            // Logs
            console.log(`[SwarmRunner] Starting swarm for ${sessionId} with query: ${query}`);

            // Configuration for the run
            const config = { configurable: { thread_id: sessionId, sessionId: sessionId } };

            // Execute
            const result = await swarmGraph.invoke(inputs, config);

            setSwarmStatus(sessionId, "completed");
            appendSwarmLog(sessionId, "Swarm execution step completed.");

        } catch (error: any) {
            console.error(`[SwarmRunner] Error in session ${sessionId}:`, error);
            setSwarmStatus(sessionId, "failed");
            appendSwarmLog(sessionId, `CRITICAL ERROR: ${error.message}`);
        }
    })();

    return { sessionId, status: "started" };
}
