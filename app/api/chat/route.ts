import { createAgent } from "@/lib/agent";
import { startSwarm } from "@/lib/swarm/runner";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { pipeJsonRender } from "@json-render/core";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json();
  const uiMessages: UIMessage[] = body.messages;

  if (!uiMessages || !Array.isArray(uiMessages) || uiMessages.length === 0) {
    return new Response(
      JSON.stringify({ error: "messages array is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // 1. Generate a Session ID (or use one from headers/cookies if we had auth)
  // For this demo, we'll just hash the first message or generate a random one
  // actually, let's just generate one per request for simplicity, 
  // BUT to persist context across a conversation, we should ideally get it from the client.
  // Since the client doesn't send a session ID, we'll generate one and rely on the fact 
  // that this is a "per-chat" swarm.
  // A better hack: Use the conversation ID if available, or just a random one.
  const sessionId = Math.random().toString(36).substring(7);

  // 2. Extract the latest user query to start the swarm
  // Find the last message that is from the user
  const lastUserMessage = [...uiMessages].reverse().find(m => m.role === 'user');
  const query = lastUserMessage && 'content' in lastUserMessage ? (lastUserMessage as any).content : "No query";

  // 3. Start the Swarm (Fire and Forget)
  // We only start it if there is a query.
  if (query) {
    console.log(`[Route] Starting Swarm for session ${sessionId} with query: ${query.slice(0, 50)}...`);
    startSwarm(sessionId, query as string);
  }

  // 4. Create the Agent with the Swarm Reader tool injected
  const agent = createAgent(sessionId);

  const modelMessages = await convertToModelMessages(uiMessages);
  const result = await agent.stream({ messages: modelMessages });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.merge(pipeJsonRender(result.toUIMessageStream()));
    },
  });

  return createUIMessageStreamResponse({ stream });
}