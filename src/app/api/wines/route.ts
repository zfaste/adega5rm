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
  if (request.headers.get("content-type")?.includes("application/json")) {
    const payload = await request.json() as { action?: string; wineId?: string; kind?: string; quantity?: unknown; note?: string; guideReference?: string; items?: unknown; name?: unknown; winery?: unknown; vintage?: unknown; grape?: unknown; type?: unknown; country?: unknown; volumeMl?: unknown; referencePrice?: unknown; location?: unknown; notes?: unknown };
    const { action, wineId, kind, quantity, note, guideReference } = payload;
    const items = Array.isArray(payload.items) ? payload.items as Array<{ wineId?: string; quantity?: unknown }> : [];
    const headersAuth = { apikey: key, Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" };
    if (action === "update") {
      if (!wineId) return NextResponse.json({ error: "Garrafa inválida." }, { status: 400 });
      const text = (value: unknown) => typeof value === "string" ? value.trim() || null : null;
      const number = (value: unknown) => value === "" || value === null || value === undefined ? null : Number(value);
      const price = number(payload.referencePrice);
      const volume = number(payload.volumeMl);
      const vintage = number(payload.vintage);
      if (!text(payload.name) || (price !== null && !Number.isFinite(price)) || (volume !== null && (!Number.isInteger(volume) || volume <= 0)) || (vintage !== null && (!Number.isInteger(vintage) || vintage < 1800 || vintage > 2100))) return NextResponse.json({ error: "Confira o nome, preço, volume e safra informados." }, { status: 400 });
      const update = await fetch(`${url}/rest/v1/wines?id=eq.${encodeURIComponent(wineId)}`, {
        method: "PATCH", headers: { ...headersAuth, Prefer: "return=representation" },
        body: JSON.stringify({ name: text(payload.name), winery: text(payload.winery), vintage, grape_variety: text(payload.grape), wine_type: text(payload.type), country: text(payload.country), volume_ml: volume, reference_price: price, location: text(payload.location), history_notes: text(payload.notes) }),
      });
      if (!update.ok) { const error = await update.json().catch(() => ({})); return NextResponse.json({ error: error.message || "Não foi possível atualizar a garrafa." }, { status: 400 }); }
      return NextResponse.json({ ok: true, message: "Dados da garrafa atualizados." });
    }
    if (action === "delete") {
      if (!wineId) return NextResponse.json({ error: "Garrafa inválida." }, { status: 400 });
      const remove = await fetch(`${url}/rest/v1/wines?id=eq.${encodeURIComponent(wineId)}`, { method: "DELETE", headers: { ...headersAuth, Prefer: "return=representation" } });
      if (!remove.ok) { const error = await remove.json().catch(() => ({})); return NextResponse.json({ error: error.message || "Não foi possível excluir a garrafa." }, { status: 400 }); }
      return NextResponse.json({ ok: true, message: "Garrafa excluída." });
    }
    const rpc = action === "note" ? "append_wine_note" : action === "movement" ? "record_wine_movement" : action === "issue_batch" ? "record_wine_issue_batch" : null;
    if (!rpc || (action !== "issue_batch" && !wineId)) return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
    if (action === "issue_batch" && (!items.length || !guideReference?.trim() || items.some((item) => !item.wineId || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0))) return NextResponse.json({ error: "Informe a guia e ao menos uma garrafa válida para a saída." }, { status: 400 });
    const body = action === "note"
      ? { p_wine_id: wineId, p_note: note }
      : action === "issue_batch"
        ? { p_items: items.map((item) => ({ wine_id: item.wineId, quantity: Number(item.quantity) })), p_guide_reference: guideReference, p_note: note }
        : { p_wine_id: wineId, p_kind: kind, p_quantity: Number(quantity), p_note: note, p_guide_reference: guideReference || null };
    const response = await fetch(`${url}/rest/v1/rpc/${rpc}`, { method: "POST", headers: headersAuth, body: JSON.stringify(body) });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json({ error: error.message || "Não foi possível registrar a operação." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, message: action === "note" ? "Observação adicionada." : action === "issue_batch" ? "Saída registrada na guia informada." : "Movimentação registrada." });
  }
  const data = await request.formData();
  if (data.get("action") === "create") {
    const name = String(data.get("name") || "").trim();
    const toNumber = (value: FormDataEntryValue | null) => { const raw = String(value || "").trim(); if (!raw) return null; const parsed = Number(raw.replace(",", ".")); return Number.isFinite(parsed) ? parsed : null; };
    const toInteger = (value: FormDataEntryValue | null) => {
      const raw = String(value || "").trim();
      if (!raw) return null;
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const quantity = toInteger(data.get("quantity")); const minimumStock = toInteger(data.get("minimumStock"));
    if (!name || quantity === null || quantity < 0 || minimumStock === null || minimumStock < 0) return NextResponse.json({ error: "Informe nome, quantidade inicial e estoque mínimo válidos." }, { status: 400 });
    const photo = data.get("photo"); let imagePath: string | null = null;
    if (photo instanceof File && photo.size > 0) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type) || photo.size > 5 * 1024 * 1024) return NextResponse.json({ error: "A foto deve ser JPG, PNG ou WebP de até 5 MB." }, { status: 400 });
      const extension = photo.type.split("/")[1]; imagePath = `${session.id}/${crypto.randomUUID()}.${extension}`;
      const upload = await fetch(`${url}/storage/v1/object/wine-images/${imagePath}`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${session.token}`, "Content-Type": photo.type, "x-upsert": "false" }, body: await photo.arrayBuffer() });
      if (!upload.ok) return NextResponse.json({ error: "Não foi possível enviar a fotografia." }, { status: 500 });
    }
    const record = {
      user_id: session.id, name, winery: String(data.get("winery") || "").trim() || null, vintage: toInteger(data.get("vintage")), grape_variety: String(data.get("grape") || "").trim() || null, wine_type: String(data.get("type") || "").trim() || null, country: String(data.get("country") || "").trim() || null, volume_ml: toInteger(data.get("volumeMl")), reference_price: toNumber(data.get("referencePrice")), unit_value: toNumber(data.get("acquisitionValue")), location: String(data.get("location") || "").trim() || null, minimum_stock: minimumStock, initial_quantity: quantity, quantity_out: 0, current_stock: quantity, history_notes: String(data.get("notes") || "").trim() || null, image_path: imagePath, image_url: String(data.get("imageUrl") || "").trim() || null, image_source: String(data.get("imageSource") || "").trim() || (imagePath ? "Envio do usuário" : null), image_license: String(data.get("imageLicense") || "").trim() || null, source_provider: String(data.get("sourceProvider") || "").trim() || "Manual", source_url: String(data.get("sourceUrl") || "").trim() || null,
    };
    const headersAuth = { apikey: key, Authorization: `Bearer ${session.token}`, "Content-Type": "application/json", Prefer: "return=representation" };
    const create = await fetch(`${url}/rest/v1/wines`, { method: "POST", headers: headersAuth, body: JSON.stringify(record) });
    if (!create.ok) { const failure = await create.json().catch(() => ({})); return NextResponse.json({ error: failure.message || "Não foi possível cadastrar o vinho. Verifique se a safra já está cadastrada." }, { status: 400 }); }
    return NextResponse.json({ ok: true, wine: (await create.json())[0] });
  }
  const file = data.get("file");
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
