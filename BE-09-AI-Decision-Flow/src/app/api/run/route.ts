import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import type { FlowEdge, FlowNode } from "@/inngest/functions";

// Triggers the workflow through Inngest and returns the event id so the
// client can poll /api/run/[eventId] for the result.
export async function POST(req: Request) {
  const body = (await req.json()) as {
    nodes: FlowNode[];
    edges: FlowEdge[];
    startNodeId: string;
  };

  if (!body.startNodeId || !body.nodes?.length) {
    return NextResponse.json(
      { error: "nodes and startNodeId are required" },
      { status: 400 }
    );
  }

  const { ids } = await inngest.send({
    name: "workflow/run",
    data: body,
  });

  return NextResponse.json({ eventId: ids[0] });
}
