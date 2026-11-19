"use client";

import { useMemo, useState } from "react";

export type CollectionWine = {
  id: string; name: string; winery: string | null; vintage: number | null; country: string | null; wine_type: string | null; location: string | null;
  volume_ml: number | null; reference_price: number | null; unit_value: number | null; current_stock: number; quantity_out: number;
  grape_variety: string | null; history_notes: string | null; image_url: string | null; image_path: string | null;
};

type CartItem = { wineId: string; quantity: number };
type Sort = "relevance" | "alphabetical" | "most-issued" | "lowest-price" | "highest-price" | "lowest-stock";
type QuickAction = { wine: CollectionWine; mode: "entrada" | "note" } | null;
type EditData = { name: string; winery: string; vintage: string; grape: string; type: string; country: string; volumeMl: string; referencePrice: string; location: string; notes: string };

const money = (value: number | null) => value === null ? null : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const imageSource = (wine: CollectionWine) => wine.image_path ? `/api/wine-image?path=${encodeURIComponent(wine.image_path)}` : wine.image_url ? `/api/wine-image?url=${encodeURIComponent(wine.image_url)}` : null;
function ActionIcon({ name }: { name: "out" | "in" | "note" | "edit" }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "out") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M4 12h12M12 7l5 5-5 5M5 5v14" /></svg>;
  if (name === "in") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M20 12H8M12 7l-5 5 5 5M19 5v14" /></svg>;
  if (name === "note") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M5 4h14v12H9l-4 4zM9 8h6M9 12h4" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="m14 5 5 5M5 19l3.5-.8L18 8.7 14.3 5 4.8 14.5z" /></svg>;
}

export function WineCollection({ wines }: { wines: CollectionWine[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("relevance");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [destination, setDestination] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [quickAction, setQuickAction] = useState<QuickAction>(null);
  const [quickQuantity, setQuickQuantity] = useState("1");
  const [quickNote, setQuickNote] = useState("");
  const [quickMessage, setQuickMessage] = useState("");
  const [editing, setEditing] = useState<CollectionWine | null>(null);
  const [editData, setEditData] = useState<EditData | null>(null);
  const [editMessage, setEditMessage] = useState("");

  const filtered = useMemo(() => wines.filter((wine) =>
    `${wine.name} ${wine.winery || ""} ${wine.country || ""} ${wine.wine_type || ""} ${wine.location || ""}`
      .toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")),
  ).sort((a, b) => {
    if (sort === "alphabetical") return a.name.localeCompare(b.name, "pt-BR");
    if (sort === "most-issued") return b.quantity_out - a.quantity_out;
    if (sort === "lowest-price") return (a.reference_price ?? a.unit_value ?? Infinity) - (b.reference_price ?? b.unit_value ?? Infinity);
    if (sort === "highest-price") return (b.reference_price ?? b.unit_value ?? -Infinity) - (a.reference_price ?? a.unit_value ?? -Infinity);
    if (sort === "lowest-stock") return a.current_stock - b.current_stock;
    return Number(Boolean(b.image_url || b.image_path)) - Number(Boolean(a.image_url || a.image_path)) || b.current_stock - a.current_stock || a.name.localeCompare(b.name, "pt-BR");
  }), [wines, query, sort]);

  const cartDetails = cart.map((item) => ({ ...item, wine: wines.find((wine) => wine.id === item.wineId)! })).filter((item) => item.wine);
  const add = (wineId: string) => {
    setCart((current) => current.some((item) => item.wineId === wineId) ? current : [...current, { wineId, quantity: 1 }]);
    if (window.matchMedia("(max-width: 760px)").matches) setCartOpen(true);
  };
  const commitQuantity = (wineId: string, raw: string) => {
    const quantity = Number(raw);
    if (!Number.isInteger(quantity) || quantity < 1) { setQuantityDrafts((current) => ({ ...current, [wineId]: String(cart.find((item) => item.wineId === wineId)?.quantity || 1) })); return; }
    setCart((current) => current.map((item) => item.wineId === wineId ? { ...item, quantity: Math.min(quantity, Math.max(1, wines.find((wine) => wine.id === wineId)?.current_stock || 1)) } : item));
    setQuantityDrafts((current) => { const next = { ...current }; delete next[wineId]; return next; });
  };
  const removeFromCart = (wineId: string) => {
    setCart((current) => current.filter((item) => item.wineId !== wineId));
    setQuantityDrafts((current) => { const next = { ...current }; delete next[wineId]; return next; });
  };

  const issue = async () => {
    setMessage("");
    if (!destination.trim()) return setMessage("Informe o destino desta saída.");
    if (!cartDetails.length) return setMessage("Adicione ao menos uma garrafa à saída.");
    setSaving(true);
    const response = await fetch("/api/wines", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "issue_batch", guideReference: destination, note, items: cartDetails.map((item) => ({ wineId: item.wineId, quantity: item.quantity })) }),
    });
    const data = await response.json(); setSaving(false);
    if (!response.ok) return setMessage(data.error || "Não foi possível registrar a saída.");
    setMessage(data.message); setTimeout(() => window.location.reload(), 650);
  };

  const openQuick = (wine: CollectionWine, mode: "entrada" | "note") => {
    setQuickAction({ wine, mode }); setQuickQuantity("1"); setQuickNote(""); setQuickMessage("");
  };
  const openEditor = (wine: CollectionWine) => {
    setEditing(wine);
    setEditData({ name: wine.name, winery: wine.winery || "", vintage: wine.vintage ? String(wine.vintage) : "", grape: wine.grape_variety || "", type: wine.wine_type || "", country: wine.country || "", volumeMl: wine.volume_ml ? String(wine.volume_ml) : "", referencePrice: wine.reference_price !== null ? String(wine.reference_price) : "", location: wine.location || "", notes: wine.history_notes || "" });
    setEditMessage("");
  };
  const changeEdit = (field: keyof EditData, value: string) => setEditData((current) => current ? { ...current, [field]: value } : current);
  const saveEdit = async () => {
    if (!editing || !editData) return;
    setSaving(true); setEditMessage("");
    const response = await fetch("/api/wines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", wineId: editing.id, ...editData }) });
    const data = await response.json(); setSaving(false);
    if (!response.ok) return setEditMessage(data.error || "Não foi possível atualizar a garrafa.");
    setEditMessage(data.message); setTimeout(() => window.location.reload(), 600);
  };
  const deleteBottle = async () => {
    if (!editing || !window.confirm(`Excluir “${editing.name}”? Esta ação não pode ser desfeita.`)) return;
    setSaving(true); setEditMessage("");
    const response = await fetch("/api/wines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", wineId: editing.id }) });
    const data = await response.json(); setSaving(false);
    if (!response.ok) return setEditMessage(data.error || "Não foi possível excluir a garrafa.");
    setEditMessage(data.message); setTimeout(() => window.location.reload(), 500);
  };
  const submitQuickAction = async () => {
    if (!quickAction) return;
    setQuickMessage("");
    if (quickAction.mode === "entrada" && (!Number.isInteger(Number(quickQuantity)) || Number(quickQuantity) <= 0)) return setQuickMessage("Informe uma quantidade inteira maior que zero.");
    if (quickAction.mode === "note" && !quickNote.trim()) return setQuickMessage("Escreva uma observação.");
    setSaving(true);
    const payload = quickAction.mode === "note"
      ? { action: "note", wineId: quickAction.wine.id, note: quickNote }
      : { action: "movement", wineId: quickAction.wine.id, kind: "entrada", quantity: Number(quickQuantity), note: quickNote };
    const response = await fetch("/api/wines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json(); setSaving(false);
    if (!response.ok) return setQuickMessage(data.error || "Não foi possível atualizar a garrafa.");
    setQuickMessage(data.message); setTimeout(() => window.location.reload(), 650);
  };

  const cartPanel = (modal = false) => <aside className={`issue-cart${modal ? " issue-cart-modal" : ""}`}>
    <div className="issue-cart-heading">
      <div><p>SAÍDA EM PREPARAÇÃO</p><h3>{cartDetails.length ? `${cartDetails.length} rótulo${cartDetails.length > 1 ? "s" : ""}` : "Carrinho vazio"}</h3></div>
      {modal && <button className="modal-close" type="button" onClick={() => setCartOpen(false)}>Continuar adicionando</button>}
    </div>
    {modal && <span className="cart-prompt">Revise os rótulos e escolha se deseja finalizar esta saída ou adicionar mais garrafas.</span>}
    <label className="destination-field">Destino *<input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Ex.: Jantar da 5ª DE" /></label>
    {cartDetails.length ? <div className="cart-items">{cartDetails.map((item) => <div key={item.wineId}>
      <span>{item.wine.name}<small>Disponível: {item.wine.current_stock} garrafas</small></span><label>Qtd.<input type="number" inputMode="numeric" min="1" max={Math.max(1, item.wine.current_stock)} value={quantityDrafts[item.wineId] ?? String(item.quantity)} onChange={(event) => setQuantityDrafts((current) => ({ ...current, [item.wineId]: event.target.value }))} onBlur={(event) => commitQuantity(item.wineId, event.target.value)} /></label>
      <button type="button" onClick={() => removeFromCart(item.wineId)}>Remover</button>
    </div>)}</div> : <span>Adicione garrafas pelos cards.</span>}
    <label>Observação<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Opcional" /></label>
    <button className="issue-button" type="button" disabled={!cartDetails.length || saving} onClick={issue}>{saving ? "Registrando..." : "Finalizar saída"}</button>
    {modal && <button className="continue-button" type="button" onClick={() => setCartOpen(false)}>Adicionar mais vinhos</button>}
    {message && <small className="issue-message">{message}</small>}
  </aside>;

  return <section className="collection-panel" id="relacao">
    <div className="collection-top"><div><p>ACERVO VISUAL</p><h2>Garrafas em adega</h2><span>Selecione as garrafas para preparar uma saída, registrar entrada ou adicionar observações.</span></div>
      <div className="collection-controls"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por garrafa, vinícola, país ou local" />
        <label>Ordenar<select value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="relevance">Relevância</option><option value="alphabetical">Ordem alfabética</option><option value="most-issued">Mais retirados</option><option value="lowest-price">Menor preço</option><option value="highest-price">Maior preço</option><option value="lowest-stock">Menor estoque</option></select></label>
      </div>
    </div>
    {quickAction && <section className="quick-action"><div><p>{quickAction.mode === "entrada" ? "REGISTRAR ENTRADA" : "ADICIONAR OBSERVAÇÃO"}</p><strong>{quickAction.wine.name}</strong></div>
      {quickAction.mode === "entrada" && <label>Quantidade<input type="number" min="1" value={quickQuantity} onChange={(event) => setQuickQuantity(event.target.value)} /></label>}
      <label className="quick-note">Observação<textarea value={quickNote} onChange={(event) => setQuickNote(event.target.value)} placeholder={quickAction.mode === "entrada" ? "Opcional" : "Ex.: condição da garrafa, compra ou ocorrência"} /></label>
      <button type="button" onClick={submitQuickAction} disabled={saving}>{saving ? "Registrando..." : quickAction.mode === "entrada" ? "Confirmar entrada" : "Salvar observação"}</button><button className="quiet-button" type="button" onClick={() => setQuickAction(null)}>Cancelar</button>{quickMessage && <small>{quickMessage}</small>}
    </section>}
    <div className="collection-layout"><div className="wine-grid">{filtered.length ? filtered.map((wine) => {
      const source = imageSource(wine); const added = cart.some((item) => item.wineId === wine.id);
      return <article className="wine-card" key={wine.id}><div className="wine-card-image">{source ? <img src={source} alt={`Garrafa ${wine.name}`} /> : <span>Sem foto</span>}{wine.current_stock <= 0 && <b>Esgotado</b>}</div>
        <div className="wine-card-info"><small className="wine-location">{wine.location || "Localização não informada"}</small><h3>{wine.name}</h3><p>{[wine.wine_type, wine.volume_ml && `${wine.volume_ml} ml`].filter(Boolean).join(" · ") || "Garrafa"}</p>
          <strong>{money(wine.reference_price ?? wine.unit_value) || "Valor não informado"}</strong><div><span className={wine.current_stock > 0 ? "availability" : "availability empty"}>{wine.current_stock} em estoque</span><button className="card-action card-action-primary" type="button" disabled={wine.current_stock <= 0 || added} onClick={() => add(wine.id)}><ActionIcon name="out" />{added ? "Na saída" : "Saída"}</button></div>
          <div className="card-tools"><button className="card-action" type="button" onClick={() => openQuick(wine, "entrada")}><ActionIcon name="in" />Entrada</button><button className="card-action" type="button" onClick={() => openQuick(wine, "note")}><ActionIcon name="note" />Nota</button><button className="card-action" type="button" onClick={() => openEditor(wine)}><ActionIcon name="edit" />Editar</button></div>
        </div>
      </article>;
    }) : <p className="collection-empty">Nenhuma garrafa encontrada com esse filtro.</p>}</div><div className="desktop-issue-cart">{cartPanel()}</div></div>
    {cartOpen && <div className="issue-modal" role="dialog" aria-modal="true" aria-label="Saída em preparação">{cartPanel(true)}</div>}
    {editing && editData && <div className="edit-modal" role="dialog" aria-modal="true" aria-label="Editar dados da garrafa"><section className="edit-card"><div className="edit-heading"><div><p>EDITAR GARRAFA</p><h3>{editing.name}</h3></div><button type="button" onClick={() => setEditing(null)}>Fechar</button></div><div className="edit-grid"><label>Nome<input value={editData.name} onChange={(event) => changeEdit("name", event.target.value)} /></label><label>Vinícola<input value={editData.winery} onChange={(event) => changeEdit("winery", event.target.value)} /></label><label>Safra<input type="number" min="1800" max="2100" value={editData.vintage} onChange={(event) => changeEdit("vintage", event.target.value)} /></label><label>Uva<input value={editData.grape} onChange={(event) => changeEdit("grape", event.target.value)} /></label><label>Tipo<input value={editData.type} onChange={(event) => changeEdit("type", event.target.value)} /></label><label>País<input value={editData.country} onChange={(event) => changeEdit("country", event.target.value)} /></label><label>Volume (ml)<input type="number" min="1" value={editData.volumeMl} onChange={(event) => changeEdit("volumeMl", event.target.value)} /></label><label>Preço de referência<input type="number" min="0" step="0.01" value={editData.referencePrice} onChange={(event) => changeEdit("referencePrice", event.target.value)} /></label><label>Localização<input list="edit-locations" placeholder="Ex.: Adega 5ª RM" value={editData.location} onChange={(event) => changeEdit("location", event.target.value)} /><datalist id="edit-locations"><option value="Adega 5ª RM" /><option value="BSup" /></datalist></label><label className="edit-notes">Observações<textarea value={editData.notes} onChange={(event) => changeEdit("notes", event.target.value)} /></label></div><div className="edit-actions"><button className="save-edit" type="button" onClick={saveEdit} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button><button className="delete-bottle" type="button" onClick={deleteBottle} disabled={saving}>Excluir garrafa</button></div>{editMessage && <p className="edit-message">{editMessage}</p>}</section></div>}
  </section>;
}
