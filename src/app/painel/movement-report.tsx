"use client";

import { useMemo, useState } from "react";

export type Movement = { id: string; wineName: string; kind: "entrada" | "saida"; quantity: number; note: string | null; guideReference: string | null; occurredAt: string };

export function MovementReport({ movements }: { movements: Movement[] }) {
  const [filter, setFilter] = useState<"all" | "entrada" | "saida">("all");
  const [query, setQuery] = useState("");
  const shown = useMemo(() => movements.filter((movement) => (filter === "all" || movement.kind === filter) && `${movement.wineName} ${movement.note || ""} ${movement.guideReference || ""}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))), [movements, filter, query]);
  const entries = movements.filter((movement) => movement.kind === "entrada").reduce((total, movement) => total + movement.quantity, 0);
  const exits = movements.filter((movement) => movement.kind === "saida").reduce((total, movement) => total + movement.quantity, 0);
  const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  return <section className="movement-report"><div className="movement-summary"><article><span>Entradas registradas</span><strong>{entries}</strong></article><article><span>Saídas registradas</span><strong>{exits}</strong></article><article><span>Movimentações</span><strong>{movements.length}</strong></article></div><div className="movement-toolbar"><div className="movement-filters"><button className={filter === "all" ? "active" : ""} type="button" onClick={() => setFilter("all")}>Tudo</button><button className={filter === "entrada" ? "active" : ""} type="button" onClick={() => setFilter("entrada")}>Entradas</button><button className={filter === "saida" ? "active" : ""} type="button" onClick={() => setFilter("saida")}>Saídas</button></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por garrafa, guia ou observação" /></div>{shown.length ? <div className="movement-table"><div className="movement-table-head"><span>Data e hora</span><span>Tipo</span><span>Garrafa</span><span>Qtd.</span><span>Guia / destino / observação</span></div>{shown.map((movement) => <article key={movement.id}><time>{formatDate(movement.occurredAt)}</time><span className={`movement-kind ${movement.kind}`}>{movement.kind === "entrada" ? "Entrada" : "Saída"}</span><strong>{movement.wineName}</strong><b>{movement.quantity}</b><p>{[movement.guideReference, movement.note].filter(Boolean).join(" · ") || "—"}</p></article>)}</div> : <div className="movement-empty"><strong>Nenhuma movimentação encontrada.</strong><span>Os próximos registros de entrada e saída aparecerão aqui.</span></div>}</section>;
}
