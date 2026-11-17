import { NextRequest, NextResponse } from "next/server";

const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
const url = process.env.SUPABASE_URL!;

async function signedIn(request: NextRequest) {
  const token = request.cookies.get("adega_access_token")?.value;
  if (!token) return false;
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  return response.ok;
}

function volume(value: string | undefined) { const found = value?.match(/(\d+(?:[.,]\d+)?)\s*(ml|cl|l)\b/i); if (!found) return null; const amount = Number(found[1].replace(",", ".")); return Math.round(found[2].toLowerCase() === "l" ? amount * 1000 : found[2].toLowerCase() === "cl" ? amount * 10 : amount); }

function brazilianPrice(value: unknown) {
  const label = typeof value === "string" ? value.trim() : "";
  if (!/(R\$|BRL)/i.test(label)) return null;
  const number = label.replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(number);
  return Number.isFinite(parsed) && parsed > 0 ? { value: parsed, label } : null;
}

export async function GET(request: NextRequest) {
  if (!await signedIn(request)) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (query.length < 3) return NextResponse.json({ error: "Digite pelo menos 3 caracteres." }, { status: 400 });
  const results: Array<Record<string, unknown>> = [];
  try {
    const search = new URL("https://world.openfoodfacts.org/cgi/search.pl");
    search.searchParams.set("search_terms", query); search.searchParams.set("search_simple", "1"); search.searchParams.set("action", "process"); search.searchParams.set("json", "1"); search.searchParams.set("page_size", "6"); search.searchParams.set("fields", "code,product_name,brands,quantity,origins,image_front_small_url,image_url,url,categories_tags");
    const response = await fetch(search, { headers: { "User-Agent": "Adega5RM/1.0 contact@adega5rm.local" }, cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      for (const product of data.products || []) {
        if (!product.product_name) continue;
        results.push({ id: `off-${product.code}`, name: product.product_name, winery: product.brands || null, volumeMl: volume(product.quantity), country: product.origins || null, type: null, grape: null, vintage: null, price: null, imageUrl: product.image_front_small_url || product.image_url || null, provider: "Open Food Facts", sourceUrl: product.url || `https://world.openfoodfacts.org/product/${product.code}`, license: "Open Food Facts Database License (ODbL)" });
      }
    }
  } catch { /* Manual registration remains available when the provider is unreachable. */ }
  const serpKey = process.env.SERPAPI_API_KEY;
  if (serpKey && results.length < 6) {
    try {
      const search = new URL("https://serpapi.com/search.json"); search.searchParams.set("engine", "google_shopping"); search.searchParams.set("q", query); search.searchParams.set("gl", "br"); search.searchParams.set("hl", "pt-br"); search.searchParams.set("location", "Brazil"); search.searchParams.set("api_key", serpKey);
      const response = await fetch(search, { cache: "no-store" }); const data = response.ok ? await response.json() : { shopping_results: [] };
      for (const item of (data.shopping_results || []).slice(0, 6 - results.length)) {
        const price = brazilianPrice(item.price);
        results.push({ id: `serp-${item.position}-${item.title}`, name: item.title, winery: item.source || null, volumeMl: null, country: null, type: null, grape: null, vintage: null, price: price?.value || null, priceLabel: price?.label || null, imageUrl: item.thumbnail || null, provider: "SerpApi / Google Shopping", sourceUrl: item.link || item.product_link || null, license: "Imagem não é copiada automaticamente; consulte a fonte." });
      }
    } catch { /* The Open Food Facts and manual flows continue without SerpApi. */ }
  }
  return NextResponse.json({ results: results.slice(0, 6), serpEnabled: Boolean(serpKey) });
}
