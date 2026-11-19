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
  const pdf = new jsPDF({ unit: "mm", format: "a4" }); const width = pdf.internal.pageSize.getWidth(); const height = pdf.internal.pageSize.getHeight(); const left = 16; const right = width - 16; const brand = await imageData("/brand/gabinete-5rm-bordo.png"); let y = 29;
  const footer = (page: number, pages: number) => { pdf.setDrawColor(229, 221, 223); pdf.line(left, height - 14, right, height - 14); pdf.setFontSize(8); pdf.setTextColor(130, 117, 122); pdf.text(`Adega 5ª RM · Gerado em ${formatDate(new Date().toISOString())}`, left, height - 8); pdf.text(`Página ${page} de ${pages}`, right, height - 8, { align: "right" }); };
  const heading = () => { pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, width, 19, "F"); pdf.setDrawColor(104, 23, 47); pdf.setLineWidth(.7); pdf.line(0, 18.6, width, 18.6); if (brand) { try { pdf.addImage(brand, "PNG", left, 3, 10, 13, undefined, "FAST"); } catch { /* brasão opcional */ } } pdf.setTextColor(104, 23, 47); pdf.setFontSize(10); pdf.text("ADEGA 5ª RM", left + 13, 9); pdf.setFontSize(7); pdf.setTextColor(116, 96, 102); pdf.text("CONTROLE DE GARRAFAS", left + 13, 13.2); };
  const newPage = () => { pdf.addPage(); heading(); y = 29; };
  const text = (value: string, x: number, startY: number, maxWidth: number, size = 10, color: [number, number, number] = [55, 44, 48]) => { pdf.setFontSize(size); pdf.setTextColor(...color); const lines = pdf.splitTextToSize(value, maxWidth); pdf.text(lines, x, startY); return lines.length * (size * .44 + 1.7); };
  const singleMovement = rows.length === 1; heading();
  pdf.setFontSize(20); pdf.setTextColor(43, 34, 37); const titleLines = pdf.splitTextToSize(title, right - left); pdf.text(titleLines, left, y); y += titleLines.length * 10 + 2;
  if (period) { pdf.setFontSize(10); pdf.setTextColor(119, 105, 110); pdf.text(period, left, y); y += 7; }
  pdf.setFillColor(251, 246, 247); pdf.roundedRect(left, y, right - left, 13, 3, 3, "F"); pdf.setFontSize(9); pdf.setTextColor(126, 29, 58); pdf.text(singleMovement ? "DETALHAMENTO DA MOVIMENTAÇÃO" : `${rows.length} movimentações no período`, left + 5, y + 8); if (!singleMovement) { pdf.setFontSize(11); pdf.text(`${rows.reduce((total, row) => total + row.quantity, 0)} garrafas`, right - 5, y + 8, { align: "right" }); } y += 20;
  for (const row of rows) {
    const titleHeight = Math.max(7, pdf.splitTextToSize(row.title, right - left - 20).length * 5.4); const obsHeight = row.observation ? pdf.splitTextToSize(row.observation, right - left - 12).length * 4.4 + 8 : 0; const headerHeight = 27 + titleHeight + obsHeight;
    if (y + headerHeight > height - 22) newPage();
    pdf.setFillColor(250, 248, 248); pdf.roundedRect(left, y, right - left, headerHeight, 3, 3, "F"); pdf.setFillColor(row.kind === "entrada" ? 226 : 126, row.kind === "entrada" ? 243 : 29, row.kind === "entrada" ? 232 : 58); pdf.roundedRect(left, y, 3, headerHeight, 1, 1, "F");
    text(formatDate(row.occurredAt), left + 7, y + 7, right - left - 14, 8, [125, 112, 117]); text(row.title, left + 7, y + 14, right - left - 50, 13, [43, 34, 37]);
    pdf.setFillColor(row.kind === "entrada" ? 230 : 248, row.kind === "entrada" ? 244 : 231, row.kind === "entrada" ? 233 : 236); pdf.roundedRect(right - 35, y + 6, 28, 8, 4, 4, "F"); pdf.setFontSize(8); pdf.setTextColor(row.kind === "entrada" ? 39 : 126, row.kind === "entrada" ? 108 : 29, row.kind === "entrada" ? 61 : 58); pdf.text(row.kind === "entrada" ? "ENTRADA" : "SAÍDA", right - 21, y + 11.2, { align: "center" });
    pdf.setFontSize(10); pdf.setTextColor(126, 29, 58); pdf.text(`${row.quantity} garrafa${row.quantity !== 1 ? "s" : ""}`, left + 7, y + 22 + titleHeight); if (row.observation) { pdf.setFontSize(9); pdf.setTextColor(83, 71, 76); pdf.text(`Obs.: ${row.observation}`, left + 7, y + 29 + titleHeight); } y += headerHeight + 5;
    pdf.setFontSize(8); pdf.setTextColor(126, 29, 58); pdf.text(row.items.length > 1 ? "GARRAFAS MOVIMENTADAS" : "GARRAFA MOVIMENTADA", left, y); y += 5;
    for (const item of row.items) {
      const image = await imageData(item.image); const itemX = image ? left + 20 : left + 5; const itemWidth = right - itemX - 32; const lineCount = pdf.splitTextToSize(item.name, itemWidth).length; const rowHeight = image ? Math.max(19, lineCount * 4.8 + 4) : Math.max(11, lineCount * 4.8 + 4); if (y + rowHeight > height - 22) newPage();
      pdf.setFillColor(255, 255, 255); pdf.setDrawColor(237, 231, 232); pdf.roundedRect(left, y, right - left, rowHeight, 2, 2, "FD");
      if (image) { try { pdf.addImage(image, image.startsWith("data:image/jpeg") ? "JPEG" : "PNG", left + 4, y + 2, 11, 15, undefined, "FAST"); } catch { /* imagem opcional */ } }
      text(item.name, itemX, y + (image ? 7 : 6.8), itemWidth, 9, [52, 42, 46]); pdf.setFontSize(10); pdf.setTextColor(104, 23, 47); pdf.text(String(item.quantity), right - 7, y + rowHeight / 2 + 1.8, { align: "right" });
      y += rowHeight + 3;
    }
    y += 4;
  }
  const pages = pdf.getNumberOfPages(); for (let page = 1; page <= pages; page += 1) { pdf.setPage(page); footer(page, pages); }
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
  const exportSelected = async () => { if (!selected) return; setGenerating(true); setExportMessage(""); try { await createPdf("Comprovante de movimentação", [selected]); } catch { setExportMessage("Não foi possível gerar o PDF. Tente novamente."); } finally { setGenerating(false); } };
  const reportLabel = filter === "entrada" ? "entradas" : filter === "saida" ? "saídas" : "movimentações";
  const exportPeriod = async () => { const start = startDate ? new Date(`${startDate}T00:00:00`) : null; const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null; if (!start || !end || start > end) return setExportMessage("Informe um período válido para gerar o relatório."); const selectedRows = rows.filter((row) => (filter === "all" || row.kind === filter) && new Date(row.occurredAt) >= start && new Date(row.occurredAt) <= end); if (!selectedRows.length) return setExportMessage(`Não há ${reportLabel} registradas neste período.`); setGenerating(true); setExportMessage(""); try { await createPdf(`Relatório de ${reportLabel}`, selectedRows, `Período: ${start.toLocaleDateString("pt-BR")} a ${end.toLocaleDateString("pt-BR")}`); } catch { setExportMessage("Não foi possível gerar o PDF. Tente novamente."); } finally { setGenerating(false); } };
  return <section className="movement-report"><div className="movement-summary"><article><span>Entradas registradas</span><strong>{entries}</strong></article><article><span>Saídas registradas</span><strong>{exits}</strong></article><article><span>Lançamentos</span><strong>{rows.length}</strong></article></div><div className="movement-toolbar"><div className="movement-filters"><button className={filter === "all" ? "active" : ""} type="button" onClick={() => setFilter("all")}>Tudo</button><button className={filter === "entrada" ? "active" : ""} type="button" onClick={() => setFilter("entrada")}>Entradas</button><button className={filter === "saida" ? "active" : ""} type="button" onClick={() => setFilter("saida")}>Saídas</button></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por destino, garrafa ou observação" /></div><div className="report-export"><div><p>RELATÓRIO PARA IMPRESSÃO</p><strong>Gerar PDF de {reportLabel} por período</strong></div><label>De<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Até<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><button type="button" onClick={exportPeriod} disabled={generating}>{generating ? "Gerando..." : "Gerar PDF"}</button>{exportMessage && <span>{exportMessage}</span>}</div>{shown.length ? <div className="movement-table"><div className="movement-table-head"><span>Data e hora</span><span>Tipo</span><span>Destino / título</span><span>Qtd.</span><span>Observação</span></div>{shown.map((row) => <button className="movement-row" type="button" key={row.id} onClick={() => setSelected(row)}><time>{formatDate(row.occurredAt)}</time><span className={`movement-kind ${row.kind}`}>{row.kind === "entrada" ? "Entrada" : "Saída"}</span><strong>{row.title}</strong><b>{row.quantity}</b><p>{row.observation ? `Obs.: ${row.observation}` : row.items.length > 1 ? `${row.items.length} rótulos na saída` : row.items[0]?.name || "—"}</p></button>)}</div> : <div className="movement-empty"><strong>Nenhuma movimentação encontrada.</strong><span>Os próximos registros de entrada e saída aparecerão aqui.</span></div>}{selected && <div className="movement-detail-overlay" role="dialog" aria-modal="true" aria-label="Detalhes da movimentação"><section className="movement-detail"><div className="movement-detail-heading"><div><p>{formatDate(selected.occurredAt)}</p><h3>{selected.title}</h3></div><button type="button" onClick={() => setSelected(null)}>Fechar</button></div><div className="movement-detail-meta"><span className={`movement-kind ${selected.kind}`}>{selected.kind === "entrada" ? "Entrada" : "Saída"}</span><strong>{selected.quantity} garrafa{selected.quantity !== 1 ? "s" : ""}</strong></div>{selected.observation && <div className="movement-observation"><b>Observação</b><p>{selected.observation}</p></div>}<div className="movement-items"><h4>{selected.items.length > 1 ? "Garrafas desta saída" : "Garrafa movimentada"}</h4>{selected.items.map((item, index) => <article key={`${item.name}-${index}`}>{item.image ? <img src={item.image} alt={`Garrafa ${item.name}`} /> : <span className="movement-bottle-placeholder">🍷</span>}<strong>{item.name}</strong><b>{item.quantity}</b></article>)}</div><button className="movement-pdf-button" type="button" onClick={exportSelected} disabled={generating}>{generating ? "Gerando PDF..." : "Gerar PDF detalhado"}</button>{exportMessage && <p className="movement-pdf-message">{exportMessage}</p>}</section></div>}</section>;
}
