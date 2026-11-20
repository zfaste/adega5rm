import { NextRequest, NextResponse } from "next/server";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_PUBLISHABLE_KEY!;

async function session(request: NextRequest) {
  const token = request.cookies.get("adega_access_token")?.value;
  if (!token) return null;
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  return response.ok ? token : null;
}

export async function POST(request: NextRequest) {
  const token = await session(request);
  if (!token) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  const response = await fetch(`${url}/functions/v1/manage-members`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(await request.json().catch(() => ({}))),
  });
  const data = await response.json().catch(() => ({ error: "Não foi possível concluir a solicitação." }));
  return NextResponse.json(data, { status: response.status });
}
