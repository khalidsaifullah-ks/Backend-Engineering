"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type DecisionNodeData = {
  prompt: string;
  label: string;
  status?: "idle" | "running" | "yes" | "no";
  onPromptChange?: (value: string) => void;
};

function DecisionNode({ data, selected }: NodeProps) {
  const d = data as unknown as DecisionNodeData;

  const statusVariant: "success" | "destructive" | "secondary" | "outline" =
    d.status === "yes"
      ? "success"
      : d.status === "no"
        ? "destructive"
        : d.status === "running"
          ? "secondary"
          : "outline";

  return (
    <Card
      className={`w-64 ${selected ? "ring-2 ring-neutral-500" : ""} ${
        d.status === "running" ? "animate-pulse" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} />
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{d.label}</CardTitle>
        <Badge variant={statusVariant}>{d.status ?? "idle"}</Badge>
      </CardHeader>
      <CardContent>
        <Textarea
          className="nodrag"
          rows={3}
          placeholder="Is this a support request?"
          defaultValue={d.prompt}
          onChange={(e) => d.onPromptChange?.(e.target.value)}
        />
      </CardContent>
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ left: "30%", background: "#16a34a" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ left: "70%", background: "#dc2626" }}
      />
    </Card>
  );
}

export default memo(DecisionNode);
