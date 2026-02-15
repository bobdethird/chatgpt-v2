/**
 * Shared state storage for the parallel Swarm and UI Agent.
 * 
 * We use a simple in-memory map keyed by sessionId because this is a demo/hackathon project
 * running on a local dev server or single container. For production serverless, this would 
 * need to be Redis or a database.
 */

export interface SwarmArtifact {
    id: string;
    type: "text" | "json" | "image" | "file";
    title: string;
    content: any;
    source: string; // "exa" | "stagehand" | "planner"
    timestamp: number;
}

export interface SwarmBuffer {
    logs: string[];       // Stream of thoughts/actions
    artifacts: SwarmArtifact[]; // Extracted data
    status: 'idle' | 'running' | 'completed' | 'failed';
}

// Global in-memory storage
export const swarmBuffers = new Map<string, SwarmBuffer>();

export function initSwarmBuffer(sessionId: string) {
    swarmBuffers.set(sessionId, {
        logs: [],
        artifacts: [],
        status: 'idle'
    });
}

export function getSwarmBuffer(sessionId: string): SwarmBuffer | undefined {
    return swarmBuffers.get(sessionId);
}

export function appendSwarmLog(sessionId: string, message: string) {
    const buffer = swarmBuffers.get(sessionId);
    if (buffer) {
        const timestamp = new Date().toLocaleTimeString();
        buffer.logs.push(`[${timestamp}] ${message}`);
    }
}

export function addSwarmArtifact(sessionId: string, artifact: Omit<SwarmArtifact, "id" | "timestamp">) {
    const buffer = swarmBuffers.get(sessionId);
    if (buffer) {
        buffer.artifacts.push({
            ...artifact,
            id: Math.random().toString(36).substring(7),
            timestamp: Date.now()
        });
    }
}

export function setSwarmStatus(sessionId: string, status: SwarmBuffer['status']) {
    const buffer = swarmBuffers.get(sessionId);
    if (buffer) {
        buffer.status = status;
    }
}
