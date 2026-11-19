"use client";

import { Movement } from "./movement-report";

type Wine = { id: string; name: string; current_stock: number; image_url: string | null; image_path: string | null };

const dateKey = (value: string) => new Date(value).toISOString().slice(0, 10);
const dayLabel = (value: Date) => new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(value).replace(".", "");

export function DashboardInsights({ wines, movements }: { wines: Wine[]; movements: Movement[] }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index));
    const key = dateKey(date.toISOString());
    const entries = movements.filter((movement) => movement.kind === "entrada" && dateKey(movement.occurredAt) === key).reduce((total, movement) => total + movement.quantity, 0);
    const exits = movements.filter((movement) => movement.kind === "saida" && dateKey(movement.occurredAt) === key).reduce((total, movement) => total + movement.quantity, 0);
    return { date, entries, exits };
  });
  const maximum = Math.max(1, ...days.flatMap((day) => [day.entries, day.exits]));
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const movementDays = new Set(movements.map((movement) => dateKey(movement.occurredAt)));
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(today);
  const featured = wines.filter((wine) => wine.current_stock > 0).slice(0, 6);

  return <section className="dashboard-insights" aria-label="Visão operacional">
    <article className="insight-card flow-card">
      <div className="insight-heading"><div><p>MOVIMENTAÇÃO RECENTE</p><h2>Entradas e saídas</h2></div><span>Últimos 7 dias</span></div>
      <div className="flow-legend"><span><i className="entry-dot" />Entradas</span><span><i className="exit-dot" />Saídas</span></div>
      <div className="flow-chart">{days.map((day) => <div className="flow-day" key={day.date.toISOString()}><div className="flow-bars"><span className="flow-entry" style={{ height: `${Math.max(day.entries ? 10 : 2, (day.entries / maximum) * 100)}%` }} title={`${day.entries} entradas`} /><span className="flow-exit" style={{ height: `${Math.max(day.exits ? 10 : 2, (day.exits / maximum) * 100)}%` }} title={`${day.exits} saídas`} /></div><small>{dayLabel(day.date)}</small><b>{day.entries + day.exits || "—"}</b></div>)}</div>
    </article>
    <article className="insight-card calendar-card">
      <div className="insight-heading"><div><p>CALENDÁRIO OPERACIONAL</p><h2>{monthName}</h2></div><span className="calendar-key"><i />Com movimentação</span></div>
      <div className="calendar-weekdays">{["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="calendar-days">{Array.from({ length: firstDay }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => { const day = index + 1; const date = new Date(today.getFullYear(), today.getMonth(), day); const active = movementDays.has(dateKey(date.toISOString())); const isToday = day === today.getDate(); return <span className={`${active ? "has-movement " : ""}${isToday ? "today" : ""}`} key={day}>{day}</span>; })}</div>
    </article>
    <article className="insight-card bottles-card">
      <div className="insight-heading"><div><p>ACERVO EM DESTAQUE</p><h2>Garrafas disponíveis</h2></div><span>Deslize para ver</span></div>
      <div className="bottle-strip">{featured.length ? featured.map((wine) => { const image = wine.image_path ? `/api/wine-image?path=${encodeURIComponent(wine.image_path)}` : wine.image_url; return <article key={wine.id}>{image ? <img src={image} alt={`Garrafa ${wine.name}`} /> : <span>🍷</span>}<strong>{wine.name}</strong><small>{wine.current_stock} em estoque</small></article>; }) : <p>Cadastre garrafas para visualizar o acervo.</p>}</div>
    </article>
  </section>;
}
