"use client";

import { useState } from "react";
import { CollectionWine, WineCollection } from "./wine-collection";
import { WineCatalog } from "./wine-catalog";
import { WineImporter } from "./wine-importer";

type Wine = CollectionWine & { unit_value: number | null; initial_quantity: number; quantity_out: number; current_stock: number; history_notes: string | null };
type Tab = "dashboard" | "acervo" | "cadastro" | "relacao";

const navItems: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "dashboard", label: "Painel", icon: "▦" },
  { id: "acervo", label: "Acervo visual", icon: "▤" },
  { id: "cadastro", label: "Cadastrar garrafa", icon: "+" },
  { id: "relacao", label: "Relação de garrafas", icon: "☷" },
];

export function PanelTabs({ wines, totalStock, lowStock, totalValue }: { wines: Wine[]; totalStock: number; lowStock: number; totalValue: number }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const summary = [
    { label: "Garrafas cadastradas", value: wines.length, detail: "rótulos no acervo" },
    { label: "Garrafas em estoque", value: totalStock, detail: "unidades disponíveis" },
    { label: "Valor estimado em estoque", value: totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), detail: "pelo preço de referência" },
    { label: "Estoque baixo", value: lowStock, detail: "itens para verificar" },
  ];

  return <main className="dashboard-page">
    <aside className="dashboard-sidebar">
      <div className="sidebar-brand"><img src="/brand/gabinete-5rm-bordo.png" alt="Símbolo da 5ª Região Militar" /><div><strong>Adega 5ª RM</strong><span>Controle de garrafas</span></div></div>
      <nav aria-label="Navegação principal">{navItems.map((item) => <button type="button" key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}</nav>
      <p className="sidebar-note">GESTÃO INSTITUCIONAL<br />ACESSO RESTRITO</p>
    </aside>
    <section className="dashboard-content">
      <header className="dashboard-header"><div><p>{tab === "dashboard" ? "VISÃO GERAL" : tab === "acervo" ? "ACERVO VISUAL" : tab === "cadastro" ? "CATÁLOGO INTELIGENTE" : "CONTROLE DE ESTOQUE"}</p><h1>{tab === "dashboard" ? "Painel da Adega" : tab === "acervo" ? "Garrafas em adega" : tab === "cadastro" ? "Cadastrar garrafa" : "Relação de garrafas"}</h1></div><button className="catalog-open header-add" type="button" onClick={() => setTab("cadastro")}>+ Adicionar garrafa</button></header>
      {tab === "dashboard" && <section className="summary-grid" aria-label="Resumo do estoque">{summary.map((item) => <article className="summary-card" key={item.label}><p>{item.label}</p><strong>{item.value}</strong><span>{item.detail}</span></article>)}</section>}
      {tab === "acervo" && <WineCollection wines={wines} />}
      {tab === "cadastro" && <><WineCatalog initialOpen />{!wines.length && <section className="import-box"><div><p>IMPORTAÇÃO INICIAL</p><h2>Carregue seu estoque atual</h2><span>Use o CSV exportado da planilha. O sistema valida os totais antes de gravar os dados.</span></div><WineImporter /></section>}</>}
      {tab === "relacao" && <section className="wine-list"><div className="section-heading"><div><p>CONTROLE DE ESTOQUE</p><h2>Relação de garrafas</h2></div><span>{wines.length ? `${wines.length} rótulos cadastrados` : "Aguardando importação"}</span></div><div className="table-wrap"><table><thead><tr><th>Garrafa</th><th>Nome</th><th>Valor de referência</th><th>Quantidade inicial</th><th>Saídas históricas</th><th>Em adega</th><th>Status</th><th>Observações</th></tr></thead><tbody>{wines.length ? wines.map((wine) => { const image = wine.image_path ? `/api/wine-image?path=${encodeURIComponent(wine.image_path)}` : wine.image_url; const price = wine.reference_price ?? wine.unit_value; return <tr key={wine.id}><td>{image ? <img className="table-bottle" src={image} alt={`Garrafa ${wine.name}`} /> : <span className="table-bottle empty">—</span>}</td><td><strong>{wine.name}</strong></td><td>{price !== null ? price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não informado"}</td><td>{wine.initial_quantity}</td><td>{wine.quantity_out}</td><td>{wine.current_stock}</td><td><span className={wine.current_stock < 0 ? "stock-tag discrepancy" : wine.current_stock <= 2 ? "stock-tag low" : "stock-tag"}>{wine.current_stock < 0 ? "Divergência" : wine.current_stock <= 2 ? "Baixo" : "Disponível"}</span></td><td>{wine.history_notes ? <details><summary>Ver</summary><p>{wine.history_notes}</p></details> : "-"}</td></tr>; }) : <tr><td colSpan={8}><div className="empty-state"><strong>Nenhuma garrafa cadastrada</strong><span>Use o cadastro de garrafas para adicionar o primeiro item.</span></div></td></tr>}</tbody></table></div></section>}
    </section>
  </main>;
}
