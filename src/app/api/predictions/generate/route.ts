import { NextResponse } from "next/server";
import { generatePrediction } from "@/lib/prediction-engine";

/**
 * Generate (or regenerate) an AI prediction for a specific match.
 *
 * POST /api/predictions/generate
 * Header: Authorization: Bearer <SYNC_SECRET>
 * Body:   { matchId: string }
 *
 * GET  /api/predictions/generate?secret=<SYNC_SECRET>&matchId=<uuid>
 * (browser-friendly for manual testing)
 *
 * The result is stored in platform_predictions (upsert) and returned in the response.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let matchId: string | undefined;
  try {
    const body = await request.json();
    matchId = body.matchId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!matchId) {
    return NextResponse.json({ error: "matchId is required" }, { status: 400 });
  }

  try {
    const result = await generatePrediction(matchId);
    return NextResponse.json({ matchId, ...result });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null
        ? JSON.stringify(err)
        : String(err);
    console.error("[predictions/generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("secret") !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const matchId = searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json({ error: "matchId query param is required" }, { status: 400 });
  }

  try {
    const result = await generatePrediction(matchId);
    return NextResponse.json({ matchId, ...result });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null
        ? JSON.stringify(err)
        : String(err);
    console.error("[predictions/generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
