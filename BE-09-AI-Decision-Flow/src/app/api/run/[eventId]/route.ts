import { NextResponse } from "next/server";

// Polls the Inngest Dev Server's REST API for the run(s) triggered by an
// event, so the browser can show live execution status without a socket.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const base = process.env.INNGEST_DEV_URL || "http://localhost:8299";

  const res = await fetch(`${base}/v1/events/${eventId}/runs`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Could not reach the Inngest dev server. Is it running?" },
      { status: 502 }
    );
  }

  const payload = await res.json();
  return NextResponse.json(payload);
}
