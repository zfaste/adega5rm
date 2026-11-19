"use client";

import { useMemo, useState } from "react";

export type Movement = { id: string; wineName: string; kind: "entrada" | "saida"; quantity: number; note: string | null; guideReference: string | null; occurredAt: string };
type ReportRow = { id: string; kind: "entrada" | "saida"; occurredAt: string; title: string; quantity: number; details: string; search: string };

export function MovementReport({ movements }: { movements: Movement[] }) {
  const [filter, setFilter] = useState<"all" | "entrada" | "saida">("all"); const [query, setQuery] = useState("");
  const rows = useMemo<ReportRow[]>(() => {
    const grouped = new Map<string, Movement[]>();
    movements.forEach((movement) => {
      const isBatchExit = movement.kind === "saida" && Boolean(movement.guideReference || movement.note);
      const key = isBatchExit ? `saida:${movement.guideReference || movement.note}:${movement.occurredAt}` : movement.id;
      grouped.set(key, [...(grouped.get(key) || []), movement]);
    });
    return [...grouped.values()].map((group) => {
      const first = group[0];
      if (first.kind === "saida" && group.length > 1) {
        const destination = first.guideReference || first.note || "Saída sem destino";
        const observation = first.guideReference ? first.note : null;
        const items = group.map((movement) => `${movement.wineName} (${movement.quantity})`).join(" · ");
        return { id: group.map((movement) => movement.id).join("-"), kind: "saida", occurredAt: first.occurredAt, title: destination, quantity: group.reduce((total, movement) => total + movement.quantity, 0), details: `${group.length} rótulos: ${items}${observation ? ` · Obs.: ${observation}` : ""}`, search: `${destination} ${items} ${observation || ""}` };
      }
      const movement = first; const destination = movement.kind === "saida" ? movement.guideReference || movement.note || "Saída sem destino" : movement.wineName;
      const details = movement.kind === "saida" ? [movement.wineName, movement.guideReference && movement.note].filter(Boolean).join(" · ") : movement.note || "Entrada registrada";
      return { id: movement.id, kind: movement.kind, occurredAt: movement.occurredAt, title: destination, quantity: movement.quantity, details, search: `${destination} ${details}` };
    });
  }, [movements]);
  const shown = rows.filter((row) => (filter === "all" || row.kind === filter) && row.search.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  const entries = movements.filter((movement) => movement.kind === "entrada").reduce((total, movement) => total + movement.quantity, 0);
  const exits = movements.filter((movement) => movement.kind === "saida").reduce((total, movement) => total + movement.quantity, 0);
  const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  return <section className="movement-report"><div className="movement-summary"><article><span>Entradas registradas</span><strong>{entries}</strong></article><article><span>Saídas registradas</span><strong>{exits}</strong></article><article><span>Lançamentos</span><strong>{rows.length}</strong></article></div><div className="movement-toolbar"><div className="movement-filters"><button className={filter === "all" ? "active" : ""} type="button" onClick={() => setFilter("all")}>Tudo</button><button className={filter === "entrada" ? "active" : ""} type="button" onClick={() => setFilter("entrada")}>Entradas</button><button className={filter === "saida" ? "active" : ""} type="button" onClick={() => setFilter("saida")}>Saídas</button></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por destino, garrafa ou observação" /></div>{shown.length ? <div className="movement-table"><div className="movement-table-head"><span>Data e hora</span><span>Tipo</span><span>Destino / garrafa</span><span>Qtd.</span><span>Itens / observação</span></div>{shown.map((row) => <article key={row.id}><time>{formatDate(row.occurredAt)}</time><span className={`movement-kind ${row.kind}`}>{row.kind === "entrada" ? "Entrada" : "Saída"}</span><strong>{row.title}</strong><b>{row.quantity}</b><p>{row.details}</p></article>)}</div> : <div className="movement-empty"><strong>Nenhuma movimentação encontrada.</strong><span>Os próximos registros de entrada e saída aparecerão aqui.</span></div>}</section>;
}
