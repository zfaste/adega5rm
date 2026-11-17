import { NextRequest, NextResponse } from "next/server";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_PUBLISHABLE_KEY!;

type WineRow = { name: string; unitValue: number | null; initialQuantity: number; quantityOut: number; currentStock: number; historyNotes: string | null };

function csvRows(text: string) {
  const rows: string[][] = [[]]; let cell = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') { if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; } else quoted = !quoted; }
    else if (char === "," && !quoted) { rows.at(-1)!.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[index + 1] === "\n") index += 1; rows.at(-1)!.push(cell); rows.push([]); cell = ""; }
    else cell += char;
  }
  rows.at(-1)!.push(cell);
  return rows.filter((row) => row.some((value) => value.trim()));
}

function integer(value: string) { const parsed = Number.parseInt(value.trim() || "0", 10); return Number.isFinite(parsed) ? parsed : NaN; }
function money(value: string) { const trimmed = value.trim(); if (!trimmed || trimmed === "-") return null; const parsed = Number.parseFloat(trimmed.replace(/[R$\s.]/g, "").replace(",", ".")); return Number.isFinite(parsed) ? parsed : NaN; }
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, "").toUpperCase(); }

async function userId(request: NextRequest) {
  const token = request.cookies.get("adega_access_token")?.value;
  if (!token) return null;
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) return null;
  const user = await response.json();
  return { id: user.id as string, token };
}

export async function POST(request: NextRequest) {
  const session = await userId(request);
  if (!session) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  const data = await request.formData(); const file = data.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) return NextResponse.json({ error: "Selecione um arquivo CSV." }, { status: 400 });
  const rows = csvRows(await file.text()); const headers = rows.shift();
  if (!headers) return NextResponse.json({ error: "O CSV está vazio." }, { status: 400 });
  const columns = new Map(headers.map((header, index) => [normalize(header), index]));
  const nameAt = columns.get("FMAURICIO"); const valueAt = columns.get("VALOR"); const quantityAt = columns.get("QUANTIDADE"); const outAt = columns.get("SAIDA"); const stockAt = columns.get("ADEGA"); const notesAt = columns.get("DESTINO/DATA");
  if ([nameAt, valueAt, quantityAt, outAt, stockAt, notesAt].some((column) => column === undefined)) return NextResponse.json({ error: "Use o modelo com as colunas Fmauricio, VALOR, QUANTIDADE, SAÍDA, ADEGA e DESTINO / DATA." }, { status: 400 });
  const wines: WineRow[] = [];
  for (const row of rows) {
    const name = row[nameAt!]?.trim(); if (!name) continue;
    const initialQuantity = integer(row[quantityAt!] || ""); const quantityOut = integer(row[outAt!] || ""); const currentStock = integer(row[stockAt!] || ""); const unitValue = money(row[valueAt!] || "");
    if ([initialQuantity, quantityOut, currentStock, unitValue].some((value) => typeof value === "number" && !Number.isFinite(value)) || initialQuantity < 0 || quantityOut < 0 || initialQuantity - quantityOut !== currentStock) return NextResponse.json({ error: `Há dados inválidos em “${name}”. Corrija o CSV e tente novamente.` }, { status: 400 });
    wines.push({ name, unitValue, initialQuantity, quantityOut, currentStock, historyNotes: row[notesAt!]?.trim() || null });
  }
  if (!wines.length) return NextResponse.json({ error: "Nenhum vinho válido foi encontrado." }, { status: 400 });
  const grouped = new Map<string, WineRow>();
  for (const wine of wines) {
    const identity = normalize(wine.name);
    const current = grouped.get(identity);
    if (!current) { grouped.set(identity, wine); continue; }
    const notes = [current.historyNotes, wine.historyNotes].filter(Boolean).join("\n");
    const differentValue = current.unitValue !== wine.unitValue;
    grouped.set(identity, {
      name: current.name,
      unitValue: differentValue ? null : current.unitValue,
      initialQuantity: current.initialQuantity + wine.initialQuantity,
      quantityOut: current.quantityOut + wine.quantityOut,
      currentStock: current.currentStock + wine.currentStock,
      historyNotes: `${differentValue ? "Valores de importação divergentes; valor unitário não definido.\n" : ""}${notes}`.trim() || null,
    });
  }
  const consolidatedWines = [...grouped.values()];
  const headersAuth = { apikey: key, Authorization: `Bearer ${session.token}`, "Content-Type": "application/json", Prefer: "return=representation" };
  const existing = await fetch(`${url}/rest/v1/wines?select=id&limit=1`, { headers: headersAuth });
  if ((await existing.json()).length) return NextResponse.json({ error: "Já existe estoque cadastrado. A importação inicial só pode ser feita uma vez." }, { status: 409 });
  const totals = consolidatedWines.reduce((result, wine) => ({ initial: result.initial + wine.initialQuantity, out: result.out + wine.quantityOut, stock: result.stock + wine.currentStock }), { initial: 0, out: 0, stock: 0 });
  const importResponse = await fetch(`${url}/rest/v1/wine_imports`, { method: "POST", headers: headersAuth, body: JSON.stringify({ user_id: session.id, source_file_name: file.name, records_count: consolidatedWines.length, initial_quantity: totals.initial, quantity_out: totals.out, current_stock: totals.stock }) });
  if (!importResponse.ok) return NextResponse.json({ error: "Não foi possível registrar a importação." }, { status: 500 });
  const [batch] = await importResponse.json();
  const wineResponse = await fetch(`${url}/rest/v1/wines`, { method: "POST", headers: headersAuth, body: JSON.stringify(consolidatedWines.map((wine) => ({ user_id: session.id, import_id: batch.id, name: wine.name, unit_value: wine.unitValue, initial_quantity: wine.initialQuantity, quantity_out: wine.quantityOut, current_stock: wine.currentStock, history_notes: wine.historyNotes }))) });
  if (!wineResponse.ok) { console.error("Wine import failed", wineResponse.status, await wineResponse.text()); return NextResponse.json({ error: "A importação não foi concluída. Tente novamente." }, { status: 500 }); }
  return NextResponse.json({ ok: true, records: consolidatedWines.length, stock: totals.stock });
}
