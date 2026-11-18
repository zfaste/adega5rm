import { NextRequest, NextResponse } from "next/server";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_PUBLISHABLE_KEY!;

export async function GET(request: NextRequest) {
  const token = request.cookies.get("adega_access_token")?.value;
  const path = request.nextUrl.searchParams.get("path") || "";
  if (!token || !path) return new NextResponse(null, { status: 401 });

  const identity = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!identity.ok) return new NextResponse(null, { status: 401 });
  const user = await identity.json();
  if (!path.startsWith(`${user.id}/`)) return new NextResponse(null, { status: 403 });

  const image = await fetch(`${url}/storage/v1/object/wine-images/${path}`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!image.ok) return new NextResponse(null, { status: image.status });
  return new NextResponse(await image.arrayBuffer(), { headers: { "Content-Type": image.headers.get("content-type") || "image/jpeg", "Cache-Control": "private, max-age=3600" } });
}
