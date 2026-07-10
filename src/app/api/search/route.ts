import { NextResponse, type NextRequest } from "next/server";
import { searchTitles } from "@/lib/contentstack/queries";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  if (query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }
  const results = await searchTitles(query.trim());
  return NextResponse.json({ results });
}
