import { getSwarmBuffer } from "@/lib/swarm/buffers";
import { NextResponse } from "next/server";

export async function GET() {
    // Hardcoded session ID as per our hackathon "Single Swarm" architecture
    const sessionId = "demo-heng-yang";
    const buffer = getSwarmBuffer(sessionId);

    // Return empty state if no buffer yet
    return NextResponse.json(buffer || {
        status: "idle",
        logs: ["No active swarm session found yet."],
        artifacts: []
    });
}
