import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";

export const maxDuration = 30;

const MODEL = process.env.AI_GATEWAY_MODEL || "anthropic/claude-sonnet-4.5";

/**
 * Change-based editing approach:
 * Instead of asking AI to return the full modified spec (which leads to wrapping),
 * we ask it to return a list of changes to apply, then we apply them ourselves.
 */

interface ElementChange {
    elementId: string;
    action: "addClassName" | "setProperty" | "updateText";
    value: string | Record<string, any>;
    propertyPath?: string; // For nested property updates
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { component, prompt } = body;

        if (!component || !prompt) {
            return new Response("Missing component or prompt", { status: 400 });
        }

        console.log("=== EDIT API (Change-Based) ===");
        console.log("Input root:", component.root);
        console.log("Elements:", Object.keys(component.elements || {}).join(", "));

        // Ask AI to describe changes, not return the full spec
        const { text } = await generateText({
            model: gateway(MODEL),
            system: `You help edit UI components by describing what changes to make.

IMPORTANT: Return ONLY a JSON array of changes. Each change describes ONE modification.

Change format:
{
  "elementId": "string",  // ID of element to modify
  "action": "addClassName" | "setProperty" | "updateText",
  "value": "string or object",
  "propertyPath": "optional.nested.path"
}

Actions:
- "addClassName": Append CSS classes to element's className
  Example: {"elementId": "main", "action": "addClassName", "value": "bg-blue-500"}
  
- "setProperty": Set a property on the element
  Example: {"elementId": "card1", "action": "setProperty", "propertyPath": "props.title", "value": "New Title"}
  
- "updateText": Change text content
  Example: {"elementId": "text1", "action": "updateText", "value": "New text"}

Example for "add blue background to main":
[{"elementId": "main", "action": "addClassName", "value": "bg-blue-500"}]

Example for "change card title to Hello":
[{"elementId": "card1", "action": "setProperty", "propertyPath": "props.title", "value": "Hello"}]

ONLY return the JSON array, no markdown, no explanation.`,
            prompt: `Component structure:
Root: "${component.root}"
Elements: ${JSON.stringify(Object.keys(component.elements), null, 2)}

Current element details (first 3):
${JSON.stringify(
                Object.entries(component.elements).slice(0, 3).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
                null,
                2
            )}

User request: "${prompt}"

What changes should be made? Return JSON array of changes:`,
        });

        console.log("AI response received");

        // Parse changes
        let jsonText = text.trim();
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        }

        const changes: ElementChange[] = JSON.parse(jsonText);
        console.log(`Applying ${changes.length} change(s)`);

        // Clone the original spec
        const modifiedSpec = JSON.parse(JSON.stringify(component));

        // Apply each change
        for (const change of changes) {
            const element = modifiedSpec.elements[change.elementId];

            if (!element) {
                console.warn(`Element "${change.elementId}" not found, skipping`);
                continue;
            }

            console.log(`- ${change.action} on "${change.elementId}"`);

            switch (change.action) {
                case "addClassName":
                    const existingClasses = element.className || "";
                    const newClasses = typeof change.value === "string" ? change.value : "";
                    element.className = existingClasses
                        ? `${existingClasses} ${newClasses}`.trim()
                        : newClasses;
                    break;

                case "setProperty":
                    if (change.propertyPath) {
                        const parts = change.propertyPath.split(".");
                        let current = element;

                        // Navigate to nested property
                        for (let i = 0; i < parts.length - 1; i++) {
                            if (!current[parts[i]]) {
                                current[parts[i]] = {};
                            }
                            current = current[parts[i]];
                        }

                        // Set the value
                        const finalKey = parts[parts.length - 1];
                        current[finalKey] = change.value;
                    } else {
                        // Set at root level of element
                        Object.assign(element, change.value);
                    }
                    break;

                case "updateText":
                    if (element.props) {
                        // Try common text properties
                        if ('content' in element.props) element.props.content = change.value;
                        else if ('text' in element.props) element.props.text = change.value;
                        else if ('label' in element.props) element.props.label = change.value;
                        else if ('value' in element.props) element.props.value = change.value;
                    }
                    break;
            }
        }

        console.log("✅ Changes applied successfully");

        return new Response(JSON.stringify({ component: modifiedSpec }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Edit failed:", error);

        // Return original component on error to prevent breaking the UI
        return new Response(JSON.stringify({
            component: body.component,
            error: error instanceof Error ? error.message : "Unknown error"
        }), {
            status: 200, // Return 200 with original component instead of 500
            headers: { "Content-Type": "application/json" },
        });
    }
}
