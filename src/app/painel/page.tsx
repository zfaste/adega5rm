import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CollectionWine } from "./wine-collection";
import { PanelTabs } from "./panel-tabs";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_PUBLISHABLE_KEY!;

type Wine = CollectionWine & {
  unit_value: number | null; initial_quantity: number; quantity_out: number; current_stock: number; history_notes: string | null;
};

export default async function Painel() {
  const cookieStore = await cookies();
  const token = cookieStore.get("adega_access_token")?.value;
  if (!token) redirect("/");

  const response = await fetch(
    `${url}/rest/v1/wines?select=id,name,winery,vintage,grape_variety,country,wine_type,volume_ml,reference_price,unit_value,location,initial_quantity,quantity_out,current_stock,history_notes,image_url,image_path&order=name.asc`,
    { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  const wines: Wine[] = response.ok ? await response.json() : [];
  const totals = wines.reduce((result, wine) => ({
    stock: result.stock + wine.current_stock,
    low: result.low + (wine.current_stock > 0 && wine.current_stock <= 2 ? 1 : 0),
    value: result.value + (wine.current_stock * (wine.reference_price ?? wine.unit_value ?? 0)),
  }), { stock: 0, low: 0, value: 0 });

  return <PanelTabs wines={wines} totalStock={totals.stock} lowStock={totals.low} totalValue={totals.value} />;
}
