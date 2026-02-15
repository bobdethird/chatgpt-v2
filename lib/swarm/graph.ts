import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { exaSearchTool, stagehandActTool } from "./tools";
import { appendSwarmLog, addSwarmArtifact, setSwarmStatus } from "./buffers";

/**
 * Define the State for the Swarm
 */
const SwarmState = Annotation.Root({
    messages: Annotation<any[]>({
        reducer: (x, y) => x.concat(y),
    }),
    sessionId: Annotation<string>({
        reducer: (x, y) => y ?? x,
    }),
});

// Tools available to the Swarm
const tools = [exaSearchTool, stagehandActTool];
const toolNode = new ToolNode(tools);

// Model
const model = new ChatOpenAI({
    model: "gpt-5-mini-2025-08-07",
    // apiKey: process.env.OPENAI_API_KEY // Optional, defaults to env
}).bindTools(tools);

/**
 * Nodes
 */

// 1. Agent Node (The Brain)
async function agentNode(state: typeof SwarmState.State) {
    const { messages, sessionId } = state;
    console.log(`[Swarm:${sessionId}] Agent thinking...`);

    // Log the thought process
    if (typeof messages[messages.length - 1].content === 'string') {
        // Log the last user message just for context if needed, but mainly we want the agent's response
    }

    const systemPrompt = new SystemMessage(
        `You are an expert Autonomous Web Agent. You do not just "search"—you **accomplish tasks** by orchestrating a suite of powerful tools.

### YOUR TOOLKIT & STRATEGY
You have two distinct modes of operation. You must choose the right tool for the right phase of the task.

1.  **exa_search (THE EYES)**
    * **When to use:** When you need *information*, *rankings*, *reviews*, or to find the *correct URL* to visit.
    * **Superpower:** It can read thousands of results instantly.
    * **Rule:** NEVER use the browser to "search for answers." Use Exa to find the answer or the target URL first.

2.  **stagehand_browser (THE HANDS)**
    * **When to use:** When you need to *interact* with a specific page (click, login, fill forms) or *extract* live data (price, stock, hidden details).
    * **Superpower:** It drives a real Chrome instance with a smart AI (GPT-5-Mini).
    * **Rule:** Give Stagehand a **specific URL** and a **concrete instruction**. Do not tell it to "go find X." Tell it to "Go to [URL] and extract X."

### EXECUTION PROTOCOL (MANDATORY)

**STEP 1: THOUGHT & PLANNING**
Before calling ANY tool, you must output a short thought block:
- **Goal:** What does the user want?
- **Missing Info:** What do I not know yet?
- **Strategy:** Will I search for knowledge first (Exa), or do I already have a target URL (Stagehand)?

**STEP 2: RESEARCH (Discovery Phase)**
*If the user asks for "The Best X" or "Find a generic item":*
1.  Call \`exa_search\` to find the consensus winner or the specific product page URL.
2.  Analyze the Exa results to locate the direct link to the target (e.g., the specific Amazon product page, not the search results page).

**STEP 3: ACTION (Execution Phase)**
*Once you have a target URL:*
1.  Call \`stagehand_browser\`.
2.  **URL Input:** Pass the specific URL you found in Step 2.
3.  **Instruction:** Give a clear, DOM-level instruction.
    * *Bad:* "Find the price."
    * *Good:* "Check the price, verify it is in stock, and click the 'Specs' tab to find the battery life."

**STEP 4: SYNTHESIS**
- Combine the broad knowledge from Exa with the specific live data from Stagehand.
- Provide a direct answer. Do not say "I found this." Say "Here is the price: $X. Link: [URL]."

### EXAMPLE WORKFLOWS

**User:** "Who is the CEO of Apple?"
**You:**
1. *Thought:* This is a knowledge query. No browsing needed.
2. **Tool:** \`exa_search({ query: "current CEO of Apple" })\`
3. **Response:** "Tim Cook is the CEO..."

**User:** "Find the best gaming mouse under $100 and check if it's in stock at Best Buy."
**You:**
1. *Thought:* I need to identify the mouse first (Research), then check stock (Action).
2. **Tool:** \`exa_search({ query: "best gaming mouse under $100 reddit consensus 2024" })\`
   *(Result: Logitech G502 Hero is the winner)*
3. **Tool:** \`exa_search({ query: "Logitech G502 Hero Best Buy product page" })\`
   *(Result: https://www.bestbuy.com/site/logitech-g502...)*
4. **Tool:** \`stagehand_browser({ url: "https://www.bestbuy.com/site/...", instruction: "Check the current price and if the 'Add to Cart' button is enabled." })\`
5. **Response:** "The best mouse is the Logitech G502 Hero. It is currently $49.99 and In Stock at Best Buy."

----------------------------------------------------------------
**CRITICAL RULES:**
- **Be Decisive:** Do not ask the user for clarification unless impossible to proceed. Make a reasonable assumption and state it.
- **Be Efficient:** Do not open a browser (Stagehand) just to read text. Use Exa for that. Only use Stagehand for *dynamic* pages or *actions*.
- **Be Honest:** If Stagehand fails to extract data, admit it. Do not hallucinate prices.`
    );

    const result = await model.invoke([systemPrompt, ...messages]);

    // Always log the content (reasoning) if present
    if (result.content) {
        appendSwarmLog(sessionId, result.content as string);
    }

    // If the agent decided to call a tool, log it
    if (result.tool_calls && result.tool_calls.length > 0) {
        const toolNames = result.tool_calls.map(tc => tc.name).join(", ");
        appendSwarmLog(sessionId, `Decided to use tool(s): ${toolNames}`);
    }

    return { messages: [result] };
}

// 2. Tool Output Processor (Intercepts tool results to save artifacts)
// LangGraph's ToolNode automatically executes tools. 
// We want to capture the output *after* ToolNode runs, but ToolNode returns ToolMessages.
// So we can insert a node *after* tools to process the latest ToolMessages.

async function artifactNode(state: typeof SwarmState.State) {
    const { messages, sessionId } = state;
    const lastMessage = messages[messages.length - 1];

    // If the last message was a ToolMessage (or array of them), extract data
    // Note: ToolNode returns an array of messages if multiple tools were called, or a single one. 
    // But in the state generic, it might be flattened. Let's assume standard behavior.

    // Check if the last few messages are ToolMessages
    // We only care about the *new* ones.
    // For simplicity in this demo, we just look at the last message.

    // In LangGraph, the 'tools' node output is appended to messages.
    // We can assume the last message is a ToolMessage if we just came from 'tools'.

    if (lastMessage.getType() === "tool") {
        try {
            const content = JSON.parse(lastMessage.content as string);
            // Heuristic: Is this a "result" worth saving?
            // If it's from Stagehand or Exa, yes.

            // Log success
            appendSwarmLog(sessionId, `Tool execution completed. Saving results.`);

            addSwarmArtifact(sessionId, {
                type: "json",
                title: `Tool Output (${lastMessage.name})`,
                content: content,
                source: lastMessage.name as any
            });

        } catch (e) {
            // Content wasn't JSON, probably just a string message.
            appendSwarmLog(sessionId, `Tool returned text: ${lastMessage.content.slice(0, 50)}...`);
        }
    }

    return {};
}

/**
 * Conditional Edge Logic
 */
function shouldContinue(state: typeof SwarmState.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    // If the LLM made a tool call, go to 'tools'
    if (lastMessage.tool_calls?.length) {
        return "tools";
    }
    // Otherwise, end
    return END;
}

/**
 * Build the Graph
 */
const workflow = new StateGraph(SwarmState)
    .addNode("agent", agentNode)
    .addNode("tools", toolNode)
    .addNode("process_artifacts", artifactNode) // Add artifact processing
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "process_artifacts") // After tools, process artifacts
    .addEdge("process_artifacts", "agent"); // Loop back to agent

export const swarmGraph = workflow.compile();
