"use client";

import { useMemo, useState } from "react";

export type Movement = { id: string; wineName: string; wineImage: string | null; kind: "entrada" | "saida"; quantity: number; note: string | null; guideReference: string | null; occurredAt: string };
type ReportItem = { name: string; quantity: number; image: string | null };
type ReportRow = { id: string; kind: "entrada" | "saida"; occurredAt: string; title: string; quantity: number; observation: string | null; items: ReportItem[]; search: string };

const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const dateForFile = () => new Intl.DateTimeFormat("pt-BR").format(new Date()).replaceAll("/", "-");

async function imageData(source: string | null) {
  if (!source) return null;
  try {
    const response = await fetch(source);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
  } catch { return null; }
}

async function createPdf(title: string, rows: ReportRow[], period?: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" }); const width = pdf.internal.pageSize.getWidth(); const height = pdf.internal.pageSize.getHeight(); let y = 20;
  const line = (text: string, size = 10, color: [number, number, number] = [67, 52, 57], indent = 15, maxWidth = width - 30) => { pdf.setFontSize(size); pdf.setTextColor(...color); const lines = pdf.splitTextToSize(text, maxWidth); if (y + lines.length * (size * .5 + 1.8) > height - 18) { pdf.addPage(); y = 20; } pdf.text(lines, indent, y); y += lines.length * (size * .5 + 1.8); };
  const divider = () => { y += 3; if (y > height - 18) { pdf.addPage(); y = 20; } pdf.setDrawColor(230, 220, 223); pdf.line(15, y, width - 15, y); y += 7; };
  pdf.setFillColor(104, 23, 47); pdf.rect(0, 0, width, 12, "F"); pdf.setTextColor(255, 255, 255); pdf.setFontSize(10); pdf.text("ADEGA 5ª RM · CONTROLE DE GARRAFAS", 15, 7.7); y = 23;
  line(title, 20, [43, 34, 37]); if (period) line(period, 10, [121, 108, 112]); line(`${rows.length} movimentação${rows.length !== 1 ? "ões" : ""} · ${rows.reduce((total, row) => total + row.quantity, 0)} garrafas`, 10, [126, 29, 58]); y += 5;
  for (const row of rows) {
    divider(); line(formatDate(row.occurredAt), 9, [117, 103, 108]); line(row.title, 14, [43, 34, 37]); line(`${row.kind === "entrada" ? "Entrada" : "Saída"} · ${row.quantity} garrafa${row.quantity !== 1 ? "s" : ""}`, 10, row.kind === "entrada" ? [39, 108, 61] : [126, 29, 58]);
    if (row.observation) line(`Observação: ${row.observation}`, 10, [84, 72, 77]);
    y += 3; line(row.items.length > 1 ? "Garrafas movimentadas" : "Garrafa movimentada", 10, [126, 29, 58]);
    for (const item of row.items) {
      const image = await imageData(item.image); const itemTop = y;
      if (image) { try { pdf.addImage(image, image.startsWith("data:image/jpeg") ? "JPEG" : "PNG", 17, y - 3, 13, 20, undefined, "FAST"); } catch { /* imagem opcional */ } }
      line(`${item.name} — ${item.quantity} unidade${item.quantity !== 1 ? "s" : ""}`, 10, [43, 34, 37], image ? 34 : 17, image ? width - 50 : width - 34);
      y = Math.max(y, itemTop + 20) + 3;
    }
  }
  const pages = pdf.getNumberOfPages(); for (let page = 1; page <= pages; page += 1) { pdf.setPage(page); pdf.setFontSize(8); pdf.setTextColor(130, 117, 122); pdf.text(`Gerado em ${formatDate(new Date().toISOString())} · Página ${page} de ${pages}`, 15, height - 9); }
  pdf.save(`${title.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-${dateForFile()}.pdf`);
}

export function MovementReport({ movements }: { movements: Movement[] }) {
  const [filter, setFilter] = useState<"all" | "entrada" | "saida">("all"); const [query, setQuery] = useState(""); const [selected, setSelected] = useState<ReportRow | null>(null); const [startDate, setStartDate] = useState(""); const [endDate, setEndDate] = useState(""); const [generating, setGenerating] = useState(false); const [exportMessage, setExportMessage] = useState("");
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
  const exportSelected = async () => { if (!selected) return; setGenerating(true); setExportMessage(""); try { await createPdf(selected.kind === "saida" ? `Saída - ${selected.title}` : `Entrada - ${selected.title}`, [selected]); } catch { setExportMessage("Não foi possível gerar o PDF. Tente novamente."); } finally { setGenerating(false); } };
  const exportPeriod = async () => { const start = startDate ? new Date(`${startDate}T00:00:00`) : null; const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null; if (!start || !end || start > end) return setExportMessage("Informe um período válido para gerar o relatório."); const selectedExits = rows.filter((row) => row.kind === "saida" && new Date(row.occurredAt) >= start && new Date(row.occurredAt) <= end); if (!selectedExits.length) return setExportMessage("Não há saídas registradas neste período."); setGenerating(true); setExportMessage(""); try { await createPdf("Relatório de saídas", selectedExits, `Período: ${start.toLocaleDateString("pt-BR")} a ${end.toLocaleDateString("pt-BR")}`); } catch { setExportMessage("Não foi possível gerar o PDF. Tente novamente."); } finally { setGenerating(false); } };
  return <section className="movement-report"><div className="movement-summary"><article><span>Entradas registradas</span><strong>{entries}</strong></article><article><span>Saídas registradas</span><strong>{exits}</strong></article><article><span>Lançamentos</span><strong>{rows.length}</strong></article></div><div className="movement-toolbar"><div className="movement-filters"><button className={filter === "all" ? "active" : ""} type="button" onClick={() => setFilter("all")}>Tudo</button><button className={filter === "entrada" ? "active" : ""} type="button" onClick={() => setFilter("entrada")}>Entradas</button><button className={filter === "saida" ? "active" : ""} type="button" onClick={() => setFilter("saida")}>Saídas</button></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por destino, garrafa ou observação" /></div><div className="report-export"><div><p>RELATÓRIO PARA IMPRESSÃO</p><strong>Gerar PDF de saídas por período</strong></div><label>De<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Até<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><button type="button" onClick={exportPeriod} disabled={generating}>{generating ? "Gerando..." : "Gerar PDF"}</button>{exportMessage && <span>{exportMessage}</span>}</div>{shown.length ? <div className="movement-table"><div className="movement-table-head"><span>Data e hora</span><span>Tipo</span><span>Destino / título</span><span>Qtd.</span><span>Observação</span></div>{shown.map((row) => <button className="movement-row" type="button" key={row.id} onClick={() => setSelected(row)}><time>{formatDate(row.occurredAt)}</time><span className={`movement-kind ${row.kind}`}>{row.kind === "entrada" ? "Entrada" : "Saída"}</span><strong>{row.title}</strong><b>{row.quantity}</b><p>{row.observation ? `Obs.: ${row.observation}` : row.items.length > 1 ? `${row.items.length} rótulos na saída` : row.items[0]?.name || "—"}</p></button>)}</div> : <div className="movement-empty"><strong>Nenhuma movimentação encontrada.</strong><span>Os próximos registros de entrada e saída aparecerão aqui.</span></div>}{selected && <div className="movement-detail-overlay" role="dialog" aria-modal="true" aria-label="Detalhes da movimentação"><section className="movement-detail"><div className="movement-detail-heading"><div><p>{formatDate(selected.occurredAt)}</p><h3>{selected.title}</h3></div><button type="button" onClick={() => setSelected(null)}>Fechar</button></div><div className="movement-detail-meta"><span className={`movement-kind ${selected.kind}`}>{selected.kind === "entrada" ? "Entrada" : "Saída"}</span><strong>{selected.quantity} garrafa{selected.quantity !== 1 ? "s" : ""}</strong></div>{selected.observation && <div className="movement-observation"><b>Observação</b><p>{selected.observation}</p></div>}<div className="movement-items"><h4>{selected.items.length > 1 ? "Garrafas desta saída" : "Garrafa movimentada"}</h4>{selected.items.map((item, index) => <article key={`${item.name}-${index}`}>{item.image ? <img src={item.image} alt={`Garrafa ${item.name}`} /> : <span className="movement-bottle-placeholder">🍷</span>}<strong>{item.name}</strong><b>{item.quantity}</b></article>)}</div><button className="movement-pdf-button" type="button" onClick={exportSelected} disabled={generating}>{generating ? "Gerando PDF..." : "Gerar PDF detalhado"}</button>{exportMessage && <p className="movement-pdf-message">{exportMessage}</p>}</section></div>}</section>;
}
