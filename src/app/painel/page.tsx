import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CollectionWine } from "./wine-collection";
import { PanelTabs } from "./panel-tabs";
import { Movement } from "./movement-report";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_PUBLISHABLE_KEY!;

type Wine = CollectionWine & {
  unit_value: number | null; initial_quantity: number; quantity_out: number; current_stock: number; minimum_stock: number; history_notes: string | null; archived_at: string | null;
};

export default async function Painel() {
  const cookieStore = await cookies();
  const token = cookieStore.get("adega_access_token")?.value;
  if (!token) redirect("/");

  const authResponse = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!authResponse.ok) redirect("/");
  const user = await authResponse.json() as { id: string };
  const memberResponse = await fetch(`${url}/rest/v1/institution_members?select=institution_id,role&user_id=eq.${encodeURIComponent(user.id)}&is_active=eq.true&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  const [membership] = memberResponse.ok ? await memberResponse.json() as Array<{ institution_id: string; role: "admin" | "operator" | "viewer" }> : [];
  if (!membership) redirect("/");

  const response = await fetch(
    `${url}/rest/v1/wines?select=id,name,winery,vintage,grape_variety,country,wine_type,volume_ml,reference_price,unit_value,location,minimum_stock,initial_quantity,quantity_out,current_stock,history_notes,image_url,image_path,archived_at&institution_id=eq.${encodeURIComponent(membership.institution_id)}&order=name.asc`,
    { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  const allWines: Wine[] = response.ok ? await response.json() : [];
  const wines = allWines.filter((wine) => !wine.archived_at);
  const movementResponse = await fetch(
    `${url}/rest/v1/wine_movements?select=id,wine_id,kind,quantity,note,guide_reference,occurred_at&institution_id=eq.${encodeURIComponent(membership.institution_id)}&order=occurred_at.desc`,
    { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  const wineDetails = new Map(allWines.map((wine) => [wine.id, { name: wine.name, image: wine.image_path ? `/api/wine-image?path=${encodeURIComponent(wine.image_path)}` : wine.image_url ? `/api/wine-image?url=${encodeURIComponent(wine.image_url)}` : null }]));
  const movements: Movement[] = movementResponse.ok ? (await movementResponse.json()).map((movement: { id: string; wine_id: string; kind: "entrada" | "saida"; quantity: number; note: string | null; guide_reference: string | null; occurred_at: string }) => ({ id: movement.id, wineName: wineDetails.get(movement.wine_id)?.name || "Garrafa removida", wineImage: wineDetails.get(movement.wine_id)?.image || null, kind: movement.kind, quantity: movement.quantity, note: movement.note, guideReference: movement.guide_reference, occurredAt: movement.occurred_at })) : [];
  const totals = wines.reduce((result, wine) => ({
    stock: result.stock + wine.current_stock,
    low: result.low + (wine.current_stock <= wine.minimum_stock ? 1 : 0),
    value: result.value + (wine.current_stock * (wine.reference_price ?? wine.unit_value ?? 0)),
  }), { stock: 0, low: 0, value: 0 });

  return <PanelTabs wines={wines} movements={movements} totalStock={totals.stock} lowStock={totals.low} totalValue={totals.value} role={membership.role} />;
}
