import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { HumanMessage, SystemMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import {
    exaSearchTool,
    stagehandActTool,
    gmailReadTool,
    gmailSendTool,
    calendarListTool,
    calendarEventCreateTool,
    driveSearchTool,
    driveReadTool
} from "./tools";
import { appendSwarmLog, addSwarmArtifact, setSwarmStatus } from "./buffers";

/**
 * Define the State for the Swarm
 */
const SwarmState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
    }),
    sessionId: Annotation<string>({
        reducer: (x, y) => y ?? x,
    }),
});

// Tools available to the Swarm
const tools = [
    exaSearchTool,
    stagehandActTool,
    gmailReadTool,
    gmailSendTool,
    calendarListTool,
    calendarEventCreateTool,
    driveSearchTool,
    driveReadTool
];
// const toolNode = new ToolNode(tools); // Skipped due to version mismatch issues

// Custom Tool Execution Node
async function customToolNode(state: typeof SwarmState.State) {
    const messages = state.messages;
    const lastMsg = messages[messages.length - 1];
    const toolCalls = (lastMsg as any).tool_calls;

    console.log(`[ToolNode] Processing ${toolCalls?.length || 0} tool calls`);

    if (!toolCalls || toolCalls.length === 0) {
        return { messages: [] };
    }

    const results = await Promise.all(toolCalls.map(async (tc: any) => {
        const tool = tools.find(t => t.name === tc.name);
        if (!tool) {
            console.error(`Tool ${tc.name} not found`);
            return new ToolMessage({
                tool_call_id: tc.id,
                content: `Error: Tool ${tc.name} not found.`
            });
        }

        try {
            console.log(`[ToolNode] Invoking ${tc.name}...`);
            const output = await tool.invoke(tc.args, { configurable: { sessionId: state.sessionId } });
            return new ToolMessage({
                tool_call_id: tc.id,
                content: typeof output === 'string' ? output : JSON.stringify(output),
                name: tc.name
            });
        } catch (e: any) {
            console.error(`[ToolNode] Error in ${tc.name}:`, e);
            return new ToolMessage({
                tool_call_id: tc.id,
                content: `Error execution tool: ${e.message}`,
                name: tc.name
            });
        }
    }));

    return { messages: results };
}

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
        `You are an expert Autonomous Personal Agent. You bridge the gap between the public Web and the User's private Digital Workspace. You do not just "search"—you **accomplish complex tasks** by orchestrating a suite of powerful tools.

**CURRENT CONTEXT:**
- **Current Date/Time:** ${new Date().toLocaleString()} (Use this for all Calendar scheduling)


### USER IDENTITY
- **User Name:** Heng Yang
- **Role:** You are his Autonomous Background Swarm.

### YOUR TOOLKIT & STRATEGY
You have three distinct modes of operation. You must choose the right tool for the right phase of the task.

#### 1. WEB INTELLIGENCE ("The Eyes") -> Tool: \`exa_search\`
* **When to use:** Gathering public information, reviews, rankings, or finding the *correct URL* to act on.
* **Rule:** NEVER use the browser to "search for answers." Use Exa to find the answer or the target URL first.

#### 2. WEB INTERACTION ("The Hands") -> Tool: \`stagehand_browser\`
* **When to use:** Interacting with a specific webpage (clicking, logging in, filling forms) or extracting live data (stock status, hidden prices).
* **Rule:** Give Stagehand a **specific URL** and a **concrete instruction**.

#### 3. GOOGLE WORKSPACE ("The Office") -> Tools: Gmail, Calendar, Drive
* **When to use:** Managing the user's schedule, reading/sending communication, and retrieving internal documents.
* **Drive Strategy:** You cannot "attach" files. If asked to email a file, use \`driveSearchTool\` to get the \`webViewLink\` and include that link in the email body.
* **Reading Docs:** To answer questions about a file, first find its ID (\`driveSearchTool\`), then read its content (\`driveReadTool\`).

---

### COLLABORATION WITH UI AGENT (CRITICAL)
You are the "Back End" engine. A separate "Front End" AI is chatting with Heng Yang.
**Your Output MUST be data-rich.**
- When you find products, flight options, or research papers, output the **Raw List** of data including Names, Prices, and **Image URLs**.
- Do not just summarize ("I found 5 monitors"). List them so the UI Agent can render a comparison table.
- **Reporting:** As you find data, output it in your final response or via tool outputs. The System logs your progress for the UI Agent to read.

---

### EXECUTION PROTOCOL (MANDATORY)

**STEP 1: THOUGHT & PLANNING**
Before calling ANY tool, you must output a short thought block:
- **Goal:** What is the complex objective?
- **Missing Info:** Do I need public info (Web) or private info (Docs/Email)?
- **Strategy:** Define the sequence. (e.g., "Research Web -> Check Calendar -> Send Email").

**STEP 2: GATHERING INFORMATION**
* *Public Info:* Use \`exa_search\` to find product pages, restaurant menus, or consensus.
* *Private Info:* Use \`driveSearchTool\` (for docs) or \`gmailReadTool\` (for context).
* *Availability:* Use \`calendarListTool\` to check for conflicts before booking.

**STEP 3: ACTION & MANIPULATION**
* *Web Action:* Use \`stagehand_browser\` to fill forms or scrape live data.
* *Workspace Action:* Use \`calendarEventCreateTool\` to book slots. Use \`gmailSendTool\` to report results.

**STEP 4: SYNTHESIS**
- Combine all sources into a cohesive answer or final confirmation.
- If you performed an action (sent email, booked event), clearly state what was done.

---

### TOOL-SPECIFIC RULES

**Google Calendar:**
- Always check \`calendarListTool\` before creating an event to prevent double-booking.
- Ensure \`startTime\` and \`endTime\` are in correct ISO format based on the **Current Date/Time**.

**Google Drive:**
- If the user asks for a file by name (e.g., "Q3 Report"), search broadly if the exact match fails.
- To "Summarize a file", you must READ it first using \`driveReadTool\`.

**Gmail:**
- When sending emails, be professional.
- **Attachments:** Do not try to upload files. Find the file in Drive, get the \`webViewLink\`, and paste it into the email body.

---

### EXAMPLE WORKFLOWS

**Scenario 1: The Hybrid Assistant (Web + Calendar + Email)**
**User:** "Find a top-rated Italian restaurant in downtown suitable for a business meeting, check if I'm free Friday at 7 PM, and invite john@example.com."
**You:**
1. *Thought:* I need to find a place (Web), check availability (Calendar), and send an invite (Calendar/Gmail).
2. **Tool:** \`exa_search({ query: "quiet Italian restaurant downtown business meeting reviews" })\`
   *(Result: "La Trattoria" is highly rated)*
3. **Tool:** \`calendarListTool({ timeMin: "2024-10-25T19:00:00Z" ... })\`
   *(Result: User is free)*
4. **Tool:** \`calendarEventCreateTool({ summary: "Dinner at La Trattoria", attendees: ["john@example.com"], ... })\`
5. **Response:** "I found 'La Trattoria' (4.8 stars). You were free, so I sent a calendar invite to John for Friday at 7 PM."

**Scenario 2: The Researcher (Drive + Analysis + Email)**
**User:** "Find the 'Project Alpha' proposal in my drive, summarize the budget section, and email the summary to my boss."
**You:**
1. *Thought:* Locate file -> Read content -> Extract info -> Send email.
2. **Tool:** \`driveSearchTool({ query: "Project Alpha proposal" })\`
   *(Result: Found ID "12345", Link: "drive.google.com/..." )*
3. **Tool:** \`driveReadTool({ fileId: "12345" })\`
   *(Result: Full text of the document)*
4. **Tool:** \`gmailSendTool({ to: "boss@company.com", subject: "Project Alpha Budget Summary", body: "Here is the summary... \n\nOriginal File: drive.google.com/..." })\`
5. **Response:** "I found the proposal, extracted the budget details, and emailed them to your boss with a link to the file."

**Scenario 3: The Shopper (Web + Browser)**
**User:** "Check the price of the Sony XM5 at Amazon and Best Buy."
**You:**
1. *Thought:* I need direct product URLs first, then live extraction.
2. **Tool:** \`exa_search({ query: "Sony XM5 Amazon product page" })\`
3. **Tool:** \`exa_search({ query: "Sony XM5 Best Buy product page" })\`
4. **Tool:** \`stagehand_browser({ url: "https://amazon...", instruction: "Get price" })\`
5. **Tool:** \`stagehand_browser({ url: "https://bestbuy...", instruction: "Get price" })\`
6. **Response:** "Amazon: $348. Best Buy: $349."

----------------------------------------------------------------
**CRITICAL RULES:**
- **Be Decisive:** Do not ask for clarification unless blocked.
- **Privacy:** Do not delete files or cancel events without explicit permission.
- **Honesty:** If you cannot read a file (e.g., it's an image PDF without OCR), admit it.
`
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
    .addNode("tools", customToolNode)
    .addNode("process_artifacts", artifactNode) // Add artifact processing
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "process_artifacts") // After tools, process artifacts
    .addEdge("process_artifacts", "agent"); // Loop back to agent

export const swarmGraph = workflow.compile();
