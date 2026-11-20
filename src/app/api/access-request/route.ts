import { NextRequest, NextResponse } from "next/server";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_PUBLISHABLE_KEY!;

export async function POST(request: NextRequest) {
  const response = await fetch(`${url}/functions/v1/request-access`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify(await request.json().catch(() => ({}))),
  });
  const data = await response.json().catch(() => ({ error: "Não foi possível enviar a solicitação." }));
  return NextResponse.json(data, { status: response.status });
}
