import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WineImporter } from "./wine-importer";
import { WineCatalog } from "./wine-catalog";
import { CollectionWine, WineCollection } from "./wine-collection";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_PUBLISHABLE_KEY!;

type Wine = CollectionWine & { unit_value: number | null; initial_quantity: number; quantity_out: number; current_stock: number; history_notes: string | null };

export default async function Painel() {
  const cookieStore = await cookies(); const token = cookieStore.get("adega_access_token")?.value;
  if (!token) redirect("/");
  const response = await fetch(`${url}/rest/v1/wines?select=id,name,winery,vintage,country,wine_type,volume_ml,reference_price,unit_value,initial_quantity,quantity_out,current_stock,history_notes,image_url,image_path&order=name.asc`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  const wines: Wine[] = response.ok ? await response.json() : [];
  const totals = wines.reduce((result, wine) => ({ stock: result.stock + wine.current_stock, low: result.low + (wine.current_stock > 0 && wine.current_stock <= 2 ? 1 : 0) }), { stock: 0, low: 0 });
  const summary = [{ label: "Vinhos cadastrados", value: wines.length, detail: "rótulos no acervo" }, { label: "Garrafas em estoque", value: totals.stock, detail: "unidades disponíveis" }, { label: "Estoque baixo", value: totals.low, detail: "itens para verificar" }];

  return <main className="dashboard-page">
    <aside className="dashboard-sidebar"><div className="sidebar-brand"><img src="/brand/gabinete-5rm-bordo.png" alt="Símbolo da 5ª Região Militar" /><div><strong>Adega 5ª RM</strong><span>Controle de vinhos</span></div></div><nav aria-label="Navegação principal"><a className="active" href="/painel"><span aria-hidden="true">▦</span> Painel</a><a href="#relacao"><span aria-hidden="true">▤</span> Acervo visual</a></nav><p className="sidebar-note">GESTÃO INSTITUCIONAL<br />ACESSO RESTRITO</p></aside>
    <section className="dashboard-content">
      <header className="dashboard-header"><div><p>VISÃO GERAL</p><h1>Painel da Adega</h1></div><div className="status"><i /> Sistema ativo</div></header>
      <section className="summary-grid" aria-label="Resumo do estoque">{summary.map((item) => <article className="summary-card" key={item.label}><p>{item.label}</p><strong>{item.value}</strong><span>{item.detail}</span></article>)}</section>
      <WineCatalog />
      {!wines.length && <section className="import-box"><div><p>IMPORTAÇÃO INICIAL</p><h2>Carregue seu estoque atual</h2><span>Use o CSV exportado da planilha. O sistema valida os totais antes de gravar os dados.</span></div><WineImporter /></section>}
      {wines.length > 0 && <WineCollection wines={wines} />}
      <section className="wine-list"><div className="section-heading"><div><p>CONTROLE DE ESTOQUE</p><h2>Relação de vinhos</h2></div><span>{wines.length ? `${wines.length} rótulos cadastrados` : "Aguardando importação"}</span></div><div className="table-wrap"><table><thead><tr><th>Garrafa</th><th>Nome do vinho</th><th>Valor de referência</th><th>Quantidade inicial</th><th>Saídas históricas</th><th>Em adega</th><th>Status</th><th>Observações</th></tr></thead><tbody>{wines.length ? wines.map((wine) => { const image = wine.image_path ? `/api/wine-image?path=${encodeURIComponent(wine.image_path)}` : wine.image_url; const price = wine.reference_price ?? wine.unit_value; return <tr key={wine.id}><td>{image ? <img className="table-bottle" src={image} alt={`Garrafa ${wine.name}`} /> : <span className="table-bottle empty">—</span>}</td><td><strong>{wine.name}</strong></td><td>{price !== null ? price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não informado"}</td><td>{wine.initial_quantity}</td><td>{wine.quantity_out}</td><td>{wine.current_stock}</td><td><span className={wine.current_stock < 0 ? "stock-tag discrepancy" : wine.current_stock <= 2 ? "stock-tag low" : "stock-tag"}>{wine.current_stock < 0 ? "Divergência" : wine.current_stock <= 2 ? "Baixo" : "Disponível"}</span></td><td>{wine.history_notes ? <details><summary>Ver</summary><p>{wine.history_notes}</p></details> : "-"}</td></tr>; }) : <tr><td colSpan={8}><div className="empty-state"><strong>Nenhum vinho cadastrado</strong><span>Use a importação inicial acima para carregar a relação.</span></div></td></tr>}</tbody></table></div></section>
    </section>
  </main>;
}
