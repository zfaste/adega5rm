"use client";

import { useMemo, useState } from "react";

export type CollectionWine = {
  id: string; name: string; winery: string | null; vintage: number | null; country: string | null; wine_type: string | null;
  volume_ml: number | null; reference_price: number | null; unit_value: number | null; current_stock: number; quantity_out: number;
  image_url: string | null; image_path: string | null;
};

type CartItem = { wineId: string; quantity: number };
type Sort = "relevance" | "alphabetical" | "most-issued" | "lowest-price" | "highest-price" | "lowest-stock";

const money = (value: number | null) => value === null ? null : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function WineCollection({ wines }: { wines: CollectionWine[] }) {
  const [query, setQuery] = useState(""); const [sort, setSort] = useState<Sort>("relevance"); const [cart, setCart] = useState<CartItem[]>([]);
  const [guideReference, setGuideReference] = useState(""); const [note, setNote] = useState(""); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  const filtered = useMemo(() => wines.filter((wine) => `${wine.name} ${wine.winery || ""} ${wine.country || ""} ${wine.wine_type || ""}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))).sort((a, b) => {
    if (sort === "alphabetical") return a.name.localeCompare(b.name, "pt-BR");
    if (sort === "most-issued") return b.quantity_out - a.quantity_out;
    if (sort === "lowest-price") return (a.reference_price ?? a.unit_value ?? Infinity) - (b.reference_price ?? b.unit_value ?? Infinity);
    if (sort === "highest-price") return (b.reference_price ?? b.unit_value ?? -Infinity) - (a.reference_price ?? a.unit_value ?? -Infinity);
    if (sort === "lowest-stock") return a.current_stock - b.current_stock;
    return Number(Boolean(b.image_url || b.image_path)) - Number(Boolean(a.image_url || a.image_path)) || b.current_stock - a.current_stock || a.name.localeCompare(b.name, "pt-BR");
  }), [wines, query, sort]);
  const cartDetails = cart.map((item) => ({ ...item, wine: wines.find((wine) => wine.id === item.wineId)! })).filter((item) => item.wine);
  const add = (wineId: string) => setCart((current) => current.some((item) => item.wineId === wineId) ? current : [...current, { wineId, quantity: 1 }]);
  const changeQuantity = (wineId: string, quantity: number) => setCart((current) => quantity <= 0 ? current.filter((item) => item.wineId !== wineId) : current.map((item) => item.wineId === wineId ? { ...item, quantity: Math.min(quantity, Math.max(1, wines.find((wine) => wine.id === wineId)?.current_stock || 1)) } : item));
  const issue = async () => {
    setMessage("");
    if (!guideReference.trim()) return setMessage("Informe o número da guia ou da saída.");
    if (!cartDetails.length) return setMessage("Adicione ao menos um vinho à saída.");
    setSaving(true);
    const response = await fetch("/api/wines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "issue_batch", guideReference, note, items: cartDetails.map((item) => ({ wineId: item.wineId, quantity: item.quantity })) }) });
    const data = await response.json(); setSaving(false);
    if (!response.ok) return setMessage(data.error || "Não foi possível registrar a saída.");
    setMessage(data.message); setTimeout(() => window.location.reload(), 650);
  };
  return <section className="collection-panel" id="relacao"><div className="collection-top"><div><p>ACERVO VISUAL</p><h2>Vinhos em adega</h2><span>Selecione as garrafas para preparar uma saída.</span></div><div className="collection-controls"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por vinho, vinícola ou país" /><label>Ordenar<select value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="relevance">Relevância</option><option value="alphabetical">Ordem alfabética</option><option value="most-issued">Mais retirados</option><option value="lowest-price">Menor preço</option><option value="highest-price">Maior preço</option><option value="lowest-stock">Menor estoque</option></select></label></div></div><div className="collection-layout"><div className="wine-grid">{filtered.length ? filtered.map((wine) => { const source = wine.image_path ? `/api/wine-image?path=${encodeURIComponent(wine.image_path)}` : wine.image_url; const added = cart.some((item) => item.wineId === wine.id); return <article className="wine-card" key={wine.id}><div className="wine-card-image">{source ? <img src={source} alt={`Garrafa ${wine.name}`} /> : <span>Sem foto</span>}{wine.current_stock <= 0 && <b>Esgotado</b>}</div><div className="wine-card-info"><small>{[wine.winery, wine.vintage, wine.country].filter(Boolean).join(" · ") || "Cadastro institucional"}</small><h3>{wine.name}</h3><p>{[wine.wine_type, wine.volume_ml && `${wine.volume_ml} ml`].filter(Boolean).join(" · ") || "Vinho"}</p><strong>{money(wine.reference_price ?? wine.unit_value) || "Valor não informado"}</strong><div><span className={wine.current_stock > 0 ? "availability" : "availability empty"}>{wine.current_stock} em estoque</span><button type="button" disabled={wine.current_stock <= 0 || added} onClick={() => add(wine.id)}>{added ? "Na saída" : "+ Adicionar à saída"}</button></div></div></article>; }) : <p className="collection-empty">Nenhum vinho encontrado com esse filtro.</p>}</div><aside className="issue-cart"><p>SAÍDA EM PREPARAÇÃO</p><h3>{cartDetails.length ? `${cartDetails.length} rótulo${cartDetails.length > 1 ? "s" : ""}` : "Carrinho vazio"}</h3>{cartDetails.length ? <div className="cart-items">{cartDetails.map((item) => <div key={item.wineId}><span>{item.wine.name}</span><label>Qtd.<input type="number" min="1" max={Math.max(1, item.wine.current_stock)} value={item.quantity} onChange={(event) => changeQuantity(item.wineId, Number(event.target.value))} /></label><button type="button" onClick={() => changeQuantity(item.wineId, 0)}>Remover</button></div>)}</div> : <span>Adicione garrafas pelos cards.</span>}<label>Guia / saída nº<input value={guideReference} onChange={(event) => setGuideReference(event.target.value)} placeholder="Ex.: Guia 042/2026" /></label><label>Destino ou observação<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Opcional" /></label><button className="issue-button" type="button" disabled={!cartDetails.length || saving} onClick={issue}>{saving ? "Registrando..." : "Confirmar saída"}</button>{message && <small className="issue-message">{message}</small>}</aside></div></section>;
}
