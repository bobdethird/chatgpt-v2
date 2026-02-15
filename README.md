# GenUIne

**The Autonomous Personal Agent for your Digital Life.**

GenUIne is a next-generation AI interface that combines specific **Generative UI** capabilities with a powerful **Autonomous Swarm** backend. It doesn't just chat; it renders interactive interfaces and performs complex actions across the web and your private workspace.

## Features

### 1. Generative UI (The Front-End)
The AI agent responds with rich, interactive UI components defined by JSONL specs, not just plain text.
-   **Interactive Dashboards**: Live data visualization using Recharts.
-   **3D Rendering**: Immersive 3D scenes using React Three Fiber (e.g., Solar System, Molecules).
-   **Dynamic Components**: Cards, tables, and forms generated on the fly.

### 2. Autonomous Swarm (The Back-End)
Powered by **LangGraph**, the Swarm Agent ("The Brain") orchestrates a suite of powerful tools to accomplish multi-step checks and tasks.

#### 🧠 LangGraph Architecture
The agent uses a cyclic state graph to plan, execute, and refine its actions. It thinks before it acts, ensuring higher reliability for complex requests.

#### 🌍 Web Intelligence (The Eyes) -> Exa
-   Instead of generic searches, the agent uses **Exa.ai** to find the *exact* information or URL needed.
-   Capable of finding specific products, reviews, and detailed answers without hallucination.

#### 🖐️ Web Interaction (The Hands) -> Stagehand
-   **Stagehand Browser Agent** allows GenUIne to interact with live webpages.
-   It can click buttons, extract hidden pricing, and navigate complex sites autonomously.

#### 🏢 Google Workspace (The Office)
-   **Gmail**: Read and send emails.
-   **Calendar**: Check availability and schedule meetings.
-   **Drive**: Search for files, read documents, and include file links in emails.

## Tech Stack

-   **Framework**: [Next.js 16 (App Router)](https://nextjs.org)
-   **AI Orchestration**: [LangGraph](https://langchain-ai.github.io/langgraphjs/) & [Vercel AI SDK](https://sdk.vercel.ai/docs)
-   **Browser Automation**: [Stagehand](https://stagehand.dev)
-   **Search**: [Exa.ai](https://exa.ai)
-   **UI Library**: [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com), [Shadcn UI](https://ui.shadcn.com)
-   **3D Rendering**: [React Three Fiber](https://r3f.docs.pmnd.rs/)

## Getting Started

### Prerequisites

-   Node.js 18+ installed
-   `npm`, `pnpm`, or `yarn`

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/genuine.git
    cd genuine
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment Variables:
    Create a `.env.local` file in the root directory.
    ```env
    # AI Keys
    OPENAI_API_KEY=sk-...
    EXA_API_KEY=...
    
    # Google Workspace (OAuth)
    GOOGLE_CLIENT_ID=...
    GOOGLE_CLIENT_SECRET=...
    
    # Optional
    AI_GATEWAY_MODEL=anthropic/claude-haiku-4.5
    ```

4.  Run the development server:
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## Project Structure

-   `app/`: Next.js App Router pages and API routes.
-   `lib/swarm/`: **The Autonomous Agent Core**.
    -   `graph.ts`: LangGraph state machine definition.
    -   `tools.ts`: Tool definitions (Exa, Stagehand, Google).
    -   `runner.ts`: Swarm execution logic.
-   `components/`: Reusable UI components.
