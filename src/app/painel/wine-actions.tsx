"use client";

import { FormEvent, useState } from "react";

type WineOption = { id: string; name: string; currentStock: number };
type Action = "entrada" | "saida" | "note";

export function WineActions({ wines }: { wines: WineOption[] }) {
  const [action, setAction] = useState<Action>("entrada"); const [wineId, setWineId] = useState(wines[0]?.id || ""); const [quantity, setQuantity] = useState("1"); const [note, setNote] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage("");
    if (!wineId) return setMessage("Escolha um vinho.");
    if (action !== "note" && (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0)) return setMessage("Informe uma quantidade inteira maior que zero.");
    if (action === "note" && !note.trim()) return setMessage("Escreva a observação.");
    setLoading(true);
    const response = await fetch("/api/wines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "note" ? { action: "note", wineId, note } : { action: "movement", wineId, kind: action, quantity, note }) });
    const data = await response.json(); setLoading(false);
    if (!response.ok) return setMessage(data.error || "Não foi possível concluir a operação.");
    setMessage(data.message); setTimeout(() => window.location.reload(), 600);
  };
  return <section className="wine-actions"><div><p>OPERAÇÕES</p><h2>Registrar movimentação</h2><span>Atualize o saldo ou acrescente uma observação ao histórico.</span></div><form onSubmit={submit}><div className="action-types"><button type="button" className={action === "entrada" ? "selected" : ""} onClick={() => setAction("entrada")}>Entrada</button><button type="button" className={action === "saida" ? "selected" : ""} onClick={() => setAction("saida")}>Saída</button><button type="button" className={action === "note" ? "selected" : ""} onClick={() => setAction("note")}>Observação</button></div><select value={wineId} onChange={(event) => setWineId(event.target.value)}><option value="">Selecione o vinho</option>{wines.map((wine) => <option key={wine.id} value={wine.id}>{wine.name} ({wine.currentStock} em adega)</option>)}</select>{action !== "note" && <input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} aria-label="Quantidade" placeholder="Quantidade" />}<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={action === "note" ? "Escreva a observação" : "Observação opcional"} /><button className="action-submit" disabled={loading}>{loading ? "Registrando..." : action === "note" ? "Adicionar observação" : `Registrar ${action}`}</button>{message && <p className="action-message">{message}</p>}</form></section>;
}
