import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// ContentStack webhook → ISR revalidation
// Configure this webhook URL in ContentStack:
//   Webhooks → New Webhook → URL: https://your-domain.com/api/revalidate
//   Headers: { "x-revalidate-token": "<CONTENTSTACK_REVALIDATE_SECRET>" }
//   Trigger: On Entry publish / unpublish

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-revalidate-token");
  const secret = process.env.CONTENTSTACK_REVALIDATE_SECRET;

  if (secret && token !== secret) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { content_type_uid, data } = body;

    // Revalidate relevant paths based on content type
    switch (content_type_uid) {
      case "movie":
      case "tv_series":
        if (data?.url) revalidatePath(`/watch/${data.url.replace(/^\//, "")}`);
        revalidatePath("/browse");
        revalidatePath("/");
        break;

      case "genre":
        if (data?.url) revalidatePath(`/genre/${data.url.replace(/^\//, "")}`);
        revalidatePath("/browse");
        break;

      case "homepage_rail":
      case "hero_banner":
        revalidatePath("/");
        break;

      case "site_config":
      case "header":
      case "footer":
      case "navigation":
        revalidatePath("/", "layout");
        break;

      default:
        revalidatePath("/");
    }

    return NextResponse.json({
      revalidated: true,
      content_type: content_type_uid,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
}
