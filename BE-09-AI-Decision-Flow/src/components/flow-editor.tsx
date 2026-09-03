"use client";

import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import DecisionNode, { type DecisionNodeData } from "@/components/decision-node";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const nodeTypes = { decision: DecisionNode };

let idCounter = 1;
const nextId = () => `node-${idCounter++}`;

const initialNodes: Node[] = [
  {
    id: "node-1",
    type: "decision",
    position: { x: 0, y: 0 },
    data: { label: "Node 1", prompt: "Is this a support request?", status: "idle" },
  },
];
idCounter = 2;

type LogEntry = {
  nodeId: string;
  prompt: string;
  answer: "YES" | "NO";
  nextNodeId: string | null;
};

export default function FlowEditor() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // The handle the edge was dragged from (yes/no) decides the branch.
  const onConnect = useCallback((connection: Connection) => {
    const branch = connection.sourceHandle === "yes" ? "yes" : "no";
    setEdges((eds) =>
      addEdge(
        {
          ...connection,
          id: `${connection.source}-${branch}-${connection.target}`,
          label: branch.toUpperCase(),
          animated: false,
          style: { stroke: branch === "yes" ? "#16a34a" : "#dc2626" },
          data: { branch },
        },
        eds
      )
    );
  }, []);

  const addNode = useCallback(() => {
    const id = nextId();
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "decision",
        position: { x: 80 + nds.length * 40, y: 120 + nds.length * 100 },
        data: { label: `Node ${id.split("-")[1]}`, prompt: "", status: "idle" },
      },
    ]);
  }, []);

  const updatePrompt = useCallback((id: string, prompt: string) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, prompt } } : n))
    );
  }, []);

  // Wire the live onPromptChange callback into every node's data each render.
  const renderNodes = nodes.map((n) => ({
    ...n,
    data: {
      ...n.data,
      onPromptChange: (value: string) => updatePrompt(n.id, value),
    } as DecisionNodeData,
  }));

  const setStatus = (id: string, status: DecisionNodeData["status"]) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, status } } : n))
    );
  };

  const resetStatuses = () => {
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: "idle" } })));
  };

  const saveWorkflow = () => {
    const payload = { nodes, edges };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadWorkflow = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setNodes(parsed.nodes ?? []);
        setEdges(parsed.edges ?? []);
        setLogs([]);
      } catch {
        setRunError("That file isn't valid workflow JSON.");
      }
    };
    reader.readAsText(file);
  };

  const runWorkflow = async () => {
    if (nodes.length === 0) return;
    setRunError(null);
    setLogs([]);
    resetStatuses();
    setRunning(true);
    setStatus(nodes[0].id, "running");

    try {
      const startNodeId = nodes[0].id;
      const flowNodes = nodes.map((n) => ({
        id: n.id,
        prompt: (n.data as DecisionNodeData).prompt,
        label: (n.data as DecisionNodeData).label,
      }));
      const flowEdges = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        branch: (e.data as { branch?: "yes" | "no" } | undefined)?.branch ?? "no",
      }));

      const triggerRes = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: flowNodes, edges: flowEdges, startNodeId }),
      });
      if (!triggerRes.ok) {
        throw new Error((await triggerRes.json()).error ?? "Failed to start run");
      }
      const { eventId } = await triggerRes.json();

      // Poll the Inngest dev server until the run finishes.
      let result: { history: LogEntry[] } | null = null;
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const pollRes = await fetch(`/api/run/${eventId}`);
        const pollPayload: {
          data?: Array<{ status: string; output?: { history: LogEntry[] } }>;
        } = await pollRes.json();
        const run = pollPayload?.data?.[0];
        if (run?.status === "Completed" && run.output) {
          result = run.output;
          break;
        }
        if (run?.status === "Failed" || run?.status === "Cancelled") {
          throw new Error(`Run ${run.status.toLowerCase()}`);
        }
      }

      if (!result) throw new Error("Timed out waiting for the workflow to finish.");

      const history: LogEntry[] = result.history ?? [];
      setLogs(history);
      history.forEach((entry) => {
        setStatus(entry.nodeId, entry.answer === "YES" ? "yes" : "no");
      });
    } catch (err: unknown) {
      setRunError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="grid h-screen grid-cols-[1fr_320px]">
      <div className="relative">
        <div className="absolute z-10 flex gap-2 p-3">
          <Button onClick={addNode} size="sm">
            + Add node
          </Button>
          <Button onClick={runWorkflow} size="sm" variant="default" disabled={running}>
            {running ? "Running..." : "Run workflow"}
          </Button>
          <Button onClick={saveWorkflow} size="sm" variant="outline">
            Export JSON
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            variant="outline"
          >
            Import JSON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadWorkflow(file);
              e.target.value = "";
            }}
          />
        </div>
        <ReactFlowProvider>
          <ReactFlow
            nodes={renderNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      <div className="flex flex-col border-l border-neutral-200 bg-neutral-50 p-3">
        <h2 className="mb-2 text-sm font-semibold">Execution log</h2>
        {runError && (
          <div className="mb-2 rounded bg-red-100 p-2 text-xs text-red-700">
            {runError}
          </div>
        )}
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {logs.length === 0 && !running && (
            <p className="text-xs text-neutral-500">
              Run the workflow to see each decision step here.
            </p>
          )}
          {logs.map((entry, i) => (
            <Card key={i} className="text-xs">
              <CardHeader className="p-2 pb-0">
                <CardTitle className="text-xs">
                  Step {i + 1} · {entry.nodeId}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-1">
                <p className="text-neutral-600">{entry.prompt}</p>
                <p className="mt-1 font-semibold">
                  Answer:{" "}
                  <span className={entry.answer === "YES" ? "text-green-600" : "text-red-600"}>
                    {entry.answer}
                  </span>
                </p>
                {entry.nextNodeId && (
                  <p className="text-neutral-500">Next: {entry.nextNodeId}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
