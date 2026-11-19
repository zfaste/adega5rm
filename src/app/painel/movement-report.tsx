"use client";

import { useMemo, useState } from "react";

export type Movement = { id: string; wineName: string; wineImage: string | null; kind: "entrada" | "saida"; quantity: number; note: string | null; guideReference: string | null; occurredAt: string };
type ReportItem = { name: string; quantity: number; image: string | null };
type ReportRow = { id: string; kind: "entrada" | "saida"; occurredAt: string; title: string; quantity: number; observation: string | null; items: ReportItem[]; search: string };

export function MovementReport({ movements }: { movements: Movement[] }) {
  const [filter, setFilter] = useState<"all" | "entrada" | "saida">("all"); const [query, setQuery] = useState(""); const [selected, setSelected] = useState<ReportRow | null>(null);
  const rows = useMemo<ReportRow[]>(() => {
    const grouped = new Map<string, Movement[]>();
    movements.forEach((movement) => {
      const batch = movement.kind === "saida" && Boolean(movement.guideReference || movement.note);
      const key = batch ? `saida:${movement.guideReference || movement.note}:${movement.occurredAt}` : movement.id;
      grouped.set(key, [...(grouped.get(key) || []), movement]);
    });
    return [...grouped.values()].map((group) => {
      const first = group[0]; const isBatch = first.kind === "saida" && group.length > 1;
      const title = first.kind === "saida" ? first.guideReference || first.note || "Saída sem destino" : first.wineName;
      const observation = first.kind === "saida" ? (first.guideReference ? first.note : null) : first.note;
      const items = group.map((movement) => ({ name: movement.wineName, quantity: movement.quantity, image: movement.wineImage }));
      const details = items.map((item) => `${item.name} ${item.quantity}`).join(" ");
      return { id: group.map((movement) => movement.id).join("-"), kind: first.kind, occurredAt: first.occurredAt, title, quantity: group.reduce((total, movement) => total + movement.quantity, 0), observation, items, search: `${title} ${observation || ""} ${details} ${isBatch ? "lote" : ""}` };
    });
  }, [movements]);
  const shown = rows.filter((row) => (filter === "all" || row.kind === filter) && row.search.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  const entries = movements.filter((movement) => movement.kind === "entrada").reduce((total, movement) => total + movement.quantity, 0);
  const exits = movements.filter((movement) => movement.kind === "saida").reduce((total, movement) => total + movement.quantity, 0);
  const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  return <section className="movement-report"><div className="movement-summary"><article><span>Entradas registradas</span><strong>{entries}</strong></article><article><span>Saídas registradas</span><strong>{exits}</strong></article><article><span>Lançamentos</span><strong>{rows.length}</strong></article></div><div className="movement-toolbar"><div className="movement-filters"><button className={filter === "all" ? "active" : ""} type="button" onClick={() => setFilter("all")}>Tudo</button><button className={filter === "entrada" ? "active" : ""} type="button" onClick={() => setFilter("entrada")}>Entradas</button><button className={filter === "saida" ? "active" : ""} type="button" onClick={() => setFilter("saida")}>Saídas</button></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por destino, garrafa ou observação" /></div>{shown.length ? <div className="movement-table"><div className="movement-table-head"><span>Data e hora</span><span>Tipo</span><span>Destino / título</span><span>Qtd.</span><span>Observação</span></div>{shown.map((row) => <button className="movement-row" type="button" key={row.id} onClick={() => setSelected(row)}><time>{formatDate(row.occurredAt)}</time><span className={`movement-kind ${row.kind}`}>{row.kind === "entrada" ? "Entrada" : "Saída"}</span><strong>{row.title}</strong><b>{row.quantity}</b><p>{row.observation ? `Obs.: ${row.observation}` : row.items.length > 1 ? `${row.items.length} rótulos na saída` : row.items[0]?.name || "—"}</p></button>)}</div> : <div className="movement-empty"><strong>Nenhuma movimentação encontrada.</strong><span>Os próximos registros de entrada e saída aparecerão aqui.</span></div>}{selected && <div className="movement-detail-overlay" role="dialog" aria-modal="true" aria-label="Detalhes da movimentação"><section className="movement-detail"><div className="movement-detail-heading"><div><p>{formatDate(selected.occurredAt)}</p><h3>{selected.title}</h3></div><button type="button" onClick={() => setSelected(null)}>Fechar</button></div><div className="movement-detail-meta"><span className={`movement-kind ${selected.kind}`}>{selected.kind === "entrada" ? "Entrada" : "Saída"}</span><strong>{selected.quantity} garrafa{selected.quantity !== 1 ? "s" : ""}</strong></div>{selected.observation && <div className="movement-observation"><b>Observação</b><p>{selected.observation}</p></div>}<div className="movement-items"><h4>{selected.items.length > 1 ? "Garrafas desta saída" : "Garrafa movimentada"}</h4>{selected.items.map((item, index) => <article key={`${item.name}-${index}`}>{item.image ? <img src={item.image} alt={`Garrafa ${item.name}`} /> : <span className="movement-bottle-placeholder">🍷</span>}<strong>{item.name}</strong><b>{item.quantity}</b></article>)}</div></section></div>}</section>;
}
