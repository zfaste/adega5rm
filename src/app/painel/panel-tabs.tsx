"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CollectionWine, WineCollection } from "./wine-collection";
import { WineCatalog } from "./wine-catalog";
import { WineImporter } from "./wine-importer";
import { Movement, MovementReport } from "./movement-report";
import { DashboardInsights } from "./dashboard-insights";

type Wine = CollectionWine & { unit_value: number | null; initial_quantity: number; quantity_out: number; current_stock: number; minimum_stock: number; history_notes: string | null };
type Role = "admin" | "operator" | "viewer";
type Tab = "dashboard" | "acervo" | "cadastro" | "movimentacoes" | "relacao";
const navItems: Array<{ id: Tab; label: string }> = [{ id: "dashboard", label: "Painel" }, { id: "acervo", label: "Acervo visual" }, { id: "cadastro", label: "Cadastrar garrafa" }, { id: "movimentacoes", label: "Movimentações" }, { id: "relacao", label: "Relação de garrafas" }];

function Icon({ name }: { name: "menu" | "close" | "dashboard" | "archive" | "plus" | "list" | "movements" | "logout" }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "menu") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M4 6h16M4 12h16M4 18h16" /></svg>;
  if (name === "close") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="m6 6 12 12M18 6 6 18" /></svg>;
  if (name === "dashboard") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect {...common} x="3" y="3" width="7" height="7" rx="1" /><rect {...common} x="14" y="3" width="7" height="7" rx="1" /><rect {...common} x="3" y="14" width="7" height="7" rx="1" /><rect {...common} x="14" y="14" width="7" height="7" rx="1" /></svg>;
  if (name === "archive") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M4 7h16v13H4zM3 4h18v3H3zM9 11h6" /></svg>;
  if (name === "plus") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M12 5v14M5 12h14" /></svg>;
  if (name === "movements") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M4 7h11M12 3l4 4-4 4M20 17H9M12 13l-4 4 4 4" /></svg>;
  if (name === "logout") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M9 6h11M9 12h11M9 18h11" /><circle {...common} cx="4" cy="6" r="1" /><circle {...common} cx="4" cy="12" r="1" /><circle {...common} cx="4" cy="18" r="1" /></svg>;
}
const tabIcon = (tab: Tab) => tab === "dashboard" ? "dashboard" : tab === "acervo" ? "archive" : tab === "cadastro" ? "plus" : tab === "movimentacoes" ? "movements" : "list";
const eyebrow = (tab: Tab) => tab === "dashboard" ? "VISÃO GERAL" : tab === "acervo" ? "ACERVO VISUAL" : tab === "cadastro" ? "CATÁLOGO INTELIGENTE" : tab === "movimentacoes" ? "CONTROLE OPERACIONAL" : "CONTROLE DE ESTOQUE";
const heading = (tab: Tab) => tab === "dashboard" ? "Painel da Adega" : tab === "acervo" ? "Garrafas em adega" : tab === "cadastro" ? "Cadastrar garrafa" : tab === "movimentacoes" ? "Entradas e saídas" : "Relação de garrafas";

export function PanelTabs({ wines, movements, totalStock, lowStock, totalValue, role }: { wines: Wine[]; movements: Movement[]; totalStock: number; lowStock: number; totalValue: number; role: Role }) {
  const router = useRouter(); const searchParams = useSearchParams(); const [menuOpen, setMenuOpen] = useState(false);
  const canOperate = role === "admin" || role === "operator"; const isAdmin = role === "admin";
  const availableNav = navItems.filter((item) => canOperate || item.id !== "cadastro");
  const requestedTab = searchParams.get("tab");
  const tab: Tab = availableNav.some((item) => item.id === requestedTab) ? requestedTab as Tab : "dashboard";
  const go = (next: Tab) => { router.replace(next === "dashboard" ? "/painel" : `/painel?tab=${next}`, { scroll: false }); setMenuOpen(false); };
  const logout = async () => { await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }); window.location.assign("/"); };
  const summary = [{ label: "Garrafas cadastradas", value: wines.length, detail: "rótulos no acervo" }, { label: "Garrafas em estoque", value: totalStock, detail: "unidades disponíveis" }, { label: "Valor estimado em estoque", value: totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), detail: "pelo preço de referência" }, { label: "Estoque baixo", value: lowStock, detail: "itens para verificar" }];

  return <main className="dashboard-page">
    {menuOpen && <button className="drawer-backdrop" type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}
    <aside className={`dashboard-sidebar${menuOpen ? " open" : ""}`}><div className="sidebar-brand"><img src="/brand/gabinete-5rm-bordo.png" alt="Símbolo da 5ª Região Militar" /><div><strong>Adega 5ª RM</strong><span>Controle de garrafas · {role === "admin" ? "Administrador" : role === "operator" ? "Operador" : "Consulta"}</span></div><button className="drawer-close" type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><Icon name="close" /></button></div><nav aria-label="Navegação principal">{availableNav.map((item) => <button type="button" key={item.id} className={tab === item.id ? "active" : ""} onClick={() => go(item.id)}><Icon name={tabIcon(item.id)} /><span>{item.label}</span></button>)}</nav><div className="sidebar-footer"><button className="logout-button" type="button" onClick={logout}><Icon name="logout" />Sair da conta</button><p className="sidebar-note">GESTÃO INSTITUCIONAL<br />ACESSO RESTRITO</p></div></aside>
    <section className="dashboard-content">
      <div className="mobile-topbar"><button type="button" className="menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Icon name="menu" /></button><strong>{heading(tab)}</strong>{tab === "cadastro" || !canOperate ? <span aria-hidden="true" /> : <button type="button" className="mobile-add" onClick={() => go("cadastro")} aria-label="Cadastrar garrafa"><Icon name="plus" /></button>}</div>
      <header className="dashboard-header"><div><p>{eyebrow(tab)}</p><h1>{heading(tab)}</h1></div>{tab !== "cadastro" && canOperate && <button className="catalog-open header-add" type="button" onClick={() => go("cadastro")}><Icon name="plus" />Adicionar garrafa</button>}</header>
      {tab === "dashboard" && <><section className="summary-grid" aria-label="Resumo do estoque">{summary.map((item) => <article className="summary-card" key={item.label}><p>{item.label}</p><strong>{item.value}</strong><span>{item.detail}</span></article>)}</section><DashboardInsights wines={wines} movements={movements} /></>}
      {tab === "acervo" && <WineCollection wines={wines} canOperate={canOperate} canArchive={isAdmin} />}
      {tab === "cadastro" && canOperate && <><WineCatalog initialOpen hideToggle />{!wines.length && <section className="import-box"><div><p>IMPORTAÇÃO INICIAL</p><h2>Carregue seu estoque atual</h2><span>Use o CSV exportado da planilha. O sistema valida os totais antes de gravar os dados.</span></div><WineImporter /></section>}</>}
      {tab === "movimentacoes" && <MovementReport movements={movements} />}
      {tab === "relacao" && <section className="wine-list"><div className="section-heading"><div><p>CONTROLE DE ESTOQUE</p><h2>Relação de garrafas</h2></div><span>{wines.length ? `${wines.length} rótulos cadastrados` : "Aguardando importação"}</span></div><div className="table-wrap"><table><thead><tr><th>Garrafa</th><th>Nome</th><th>Valor de referência</th><th>Quantidade inicial</th><th>Saídas históricas</th><th>Em adega</th><th>Status</th><th>Observações</th></tr></thead><tbody>{wines.length ? wines.map((wine) => { const image = wine.image_path ? `/api/wine-image?path=${encodeURIComponent(wine.image_path)}` : wine.image_url ? `/api/wine-image?url=${encodeURIComponent(wine.image_url)}` : null; const price = wine.reference_price ?? wine.unit_value; const low = wine.current_stock <= wine.minimum_stock; return <tr key={wine.id}><td>{image ? <img className="table-bottle" src={image} alt={`Garrafa ${wine.name}`} /> : <span className="table-bottle empty">—</span>}</td><td><strong>{wine.name}</strong></td><td>{price !== null ? price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não informado"}</td><td>{wine.initial_quantity}</td><td>{wine.quantity_out}</td><td>{wine.current_stock}</td><td><span className={low ? "stock-tag low" : "stock-tag"}>{low ? `Atenção (mín. ${wine.minimum_stock})` : "Disponível"}</span></td><td>{wine.history_notes ? <details><summary>Ver</summary><p>{wine.history_notes}</p></details> : "-"}</td></tr>; }) : <tr><td colSpan={8}><div className="empty-state"><strong>Nenhuma garrafa cadastrada</strong><span>Use o cadastro de garrafas para adicionar o primeiro item.</span></div></td></tr>}</tbody></table></div></section>}
    </section>
  </main>;
}
