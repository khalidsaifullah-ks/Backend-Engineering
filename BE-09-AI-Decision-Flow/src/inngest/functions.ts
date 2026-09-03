import OpenAI from "openai";
import { inngest } from "./client";

export type FlowNode = { id: string; prompt: string; label?: string };
export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  branch: "yes" | "no";
};

type RunWorkflowEvent = {
  name: "workflow/run";
  data: {
    nodes: FlowNode[];
    edges: FlowEdge[];
    startNodeId: string;
  };
};

const MAX_STEPS = 25;

function getClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
}

/** Sends a node's prompt to the LLM and forces a YES/NO answer. */
async function askYesNo(prompt: string): Promise<"YES" | "NO"> {
  const client = getClient();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You are a strict binary decision engine. Reply with exactly one word: YES or NO. No punctuation, no explanation.",
      },
      { role: "user", content: prompt },
    ],
  });

  const text = (response.choices[0]?.message?.content || "").trim().toUpperCase();
  return text.startsWith("Y") ? "YES" : "NO";
}

export const runWorkflow = inngest.createFunction(
  { id: "run-decision-workflow", triggers: [{ event: "workflow/run" }] },
  async ({ event, step }) => {
    const { nodes, edges, startNodeId } = event.data as RunWorkflowEvent["data"];
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    const history: Array<{
      nodeId: string;
      prompt: string;
      answer: "YES" | "NO";
      nextNodeId: string | null;
    }> = [];

    let currentId: string | null = startNodeId;
    let steps = 0;

    while (currentId && steps < MAX_STEPS) {
      const node = nodeById.get(currentId);
      if (!node) break;

      // Each node maps to one durable Inngest step.
      const answer: "YES" | "NO" = await step.run(
        `decide-${node.id}`,
        async () => askYesNo(node.prompt)
      );

      const nextEdge = edges.find(
        (e) => e.source === node.id && e.branch === answer.toLowerCase()
      );
      const nextNodeId = nextEdge ? nextEdge.target : null;

      history.push({ nodeId: node.id, prompt: node.prompt, answer, nextNodeId });

      currentId = nextNodeId;
      steps += 1;
    }

    return { history, steps };
  }
);
