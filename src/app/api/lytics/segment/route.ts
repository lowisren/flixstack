import { type NextRequest, NextResponse } from "next/server";
import { resolveSegments, getPrimarySegment } from "@/lib/lytics/segments";

// Server-side Lytics segment resolution
// Called from the client to get the visitor's segments without
// exposing the server-only LYTICS_API_KEY to the browser.

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("uid");

  if (!userId) {
    return NextResponse.json(
      { segments: ["default"], primary: "default" },
      { status: 200 }
    );
  }

  const segments = await resolveSegments(userId);
  const primary = getPrimarySegment(segments);

  return NextResponse.json(
    { segments, primary },
    {
      headers: {
        // Cache for 60 seconds — segment membership changes slowly
        "Cache-Control": "private, max-age=60",
      },
    }
  );
}
