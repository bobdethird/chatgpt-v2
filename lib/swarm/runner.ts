import { swarmGraph } from "./graph";
import { initSwarmBuffer, setSwarmStatus, appendSwarmLog } from "./buffers";
import { HumanMessage } from "@langchain/core/messages";

/**
 * Fire-and-forget runner for the Swarm.
 * This function returns immediately after starting the graph execution in the background.
 */
export function startSwarm(sessionId: string, query: string) {

    // 1. Initialize Buffer
    initSwarmBuffer(sessionId);
    setSwarmStatus(sessionId, "running");
    appendSwarmLog(sessionId, `Swarm started for query: "${query}"`);

    // 2. Start Execution (Fire & Forget)
    // We use detailed error logging since we can't await this in the main thread
    (async () => {
        try {
            const inputs = {
                messages: [new HumanMessage(query)],
                sessionId: sessionId,
            };

            // Configuration for the run
            const config = { configurable: { thread_id: sessionId, sessionId: sessionId } };

            // Execute
            // We iterate over the stream to keep the buffer alive/updating? 
            // Or just await .invoke() if we don't need intermediate steps (nodes do logging).
            // .invoke() is easier for "run until done".

            const result = await swarmGraph.invoke(inputs, config);

            setSwarmStatus(sessionId, "completed");
            appendSwarmLog(sessionId, "Swarm execution completed successfully.");

        } catch (error: any) {
            console.error(`[SwarmRunner] Error in session ${sessionId}:`, error);
            setSwarmStatus(sessionId, "failed");
            appendSwarmLog(sessionId, `CRITICAL ERROR: ${error.message}`);
        }
    })();

    return { sessionId, status: "started" };
}
