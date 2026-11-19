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

async function createPdf(title: string, rows: ReportRow[]) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const width = pdf.internal.pageSize.getWidth(); const height = pdf.internal.pageSize.getHeight(); const left = 16; const right = width - 16;
  const burgundy: [number, number, number] = [118, 20, 51]; const pale: [number, number, number] = [250, 244, 246]; const ink: [number, number, number] = [45, 39, 41]; const muted: [number, number, number] = [112, 101, 105];
  const brand = await imageData("/brand/gabinete-5rm-bordo.png"); const generatedAt = formatDate(new Date().toISOString()); const singleMovement = rows.length === 1; const total = rows.reduce((sum, row) => sum + row.quantity, 0); let y = 76;
  const footer = (page: number, pages: number) => { pdf.setDrawColor(219, 207, 211); pdf.setLineWidth(.35); pdf.line(left, height - 15, right, height - 15); pdf.setFontSize(8); pdf.setTextColor(...muted); pdf.text("ADEGA 5ª RM · Controle de garrafas", left, height - 9); pdf.text(`Página ${page} de ${pages}`, right, height - 9, { align: "right" }); };
  const formalHeading = (continued = false) => {
    pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, width, continued ? 31 : 70, "F");
    if (continued) {
      if (brand) { try { pdf.addImage(brand, "PNG", left, 5, 9, 12, undefined, "FAST"); } catch { /* brasão opcional */ } }
      pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.setTextColor(...burgundy); pdf.text("ADEGA 5ª RM", left + 12, 11);
      pdf.setFontSize(7); pdf.setFont("helvetica", "normal"); pdf.setTextColor(...muted); pdf.text("RELATÓRIO DE CONTROLE DE GARRAFAS", left + 12, 15);
      pdf.setDrawColor(...burgundy); pdf.setLineWidth(.7); pdf.line(left, 23, right, 23); return;
    }
    if (brand) { try { pdf.addImage(brand, "PNG", width / 2 - 10, 8, 20, 27, undefined, "FAST"); } catch { /* brasão opcional */ } }
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(...ink); pdf.text("ADEGA 5ª RM", width / 2, 42, { align: "center" });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(...muted); pdf.text("CONTROLE DE GARRAFAS", width / 2, 46.5, { align: "center" });
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(15); pdf.setTextColor(...burgundy); pdf.text("RELATÓRIO DE CONTROLE DE GARRAFAS", width / 2, 57, { align: "center" });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(...muted); pdf.text("Adega 5ª RM", width / 2, 62, { align: "center" });
    pdf.setDrawColor(...burgundy); pdf.setLineWidth(.7); pdf.line(left, 67, right, 67);
  };
  const newPage = () => { pdf.addPage(); formalHeading(true); y = 33; };
  const text = (value: string, x: number, startY: number, maxWidth: number, size = 10, color: [number, number, number] = ink, style: "normal" | "bold" = "normal") => { pdf.setFont("helvetica", style); pdf.setFontSize(size); pdf.setTextColor(...color); const lines = pdf.splitTextToSize(value, maxWidth); pdf.text(lines, x, startY); return lines.length * (size * .44 + 1.7); };
  formalHeading();
  const destination = singleMovement ? rows[0].title : (title.replace(/^Relatório de /i, "") || "Movimentações");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(...burgundy); pdf.text(singleMovement ? "DESTINO / TÍTULO DA MOVIMENTAÇÃO" : "ABRANGÊNCIA DO RELATÓRIO", left, y);
  const destinationHeight = text(destination, left, y + 6, right - left - 65, 14, ink, "bold");
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(...muted); pdf.text(`Gerado em ${generatedAt}`, right, y + 6, { align: "right" });
  y += Math.max(destinationHeight + 8, 20);
  pdf.setFillColor(...pale); pdf.roundedRect(left, y, right - left, 18, 2, 2, "F");
  const stat = (label: string, value: string, x: number) => { pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(...muted); pdf.text(label, x, y + 6); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.setTextColor(...burgundy); pdf.text(value, x, y + 13); };
  stat("Tipo", singleMovement ? (rows[0].kind === "entrada" ? "Entrada" : "Saída") : "Geral", left + 6); stat("Lançamentos", String(rows.length), left + 62); stat("Garrafas", String(total), left + 112); y += 26;
  for (const row of rows) {
    const showRowHeading = !singleMovement;
    const observationHeight = row.observation ? pdf.splitTextToSize(`Observação: ${row.observation}`, right - left - 10).length * 4.5 + 7 : 0;
    if (showRowHeading) {
      const headingHeight = 22 + observationHeight;
      if (y + headingHeight > height - 28) newPage();
      pdf.setFillColor(...burgundy); pdf.roundedRect(left, y, right - left, 8, 2, 2, "F"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(255, 255, 255); pdf.text(row.kind === "entrada" ? "ENTRADA" : "SAÍDA", left + 4, y + 5.2); pdf.text(formatDate(row.occurredAt), right - 4, y + 5.2, { align: "right" }); y += 13;
      const rowTitleHeight = text(row.title, left, y, right - left - 32, 11, ink, "bold"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(...burgundy); pdf.text(`${row.quantity}`, right, y, { align: "right" }); y += rowTitleHeight + 2;
      if (row.observation) { y += text(`Observação: ${row.observation}`, left, y, right - left, 8.5, muted) + 3; }
    } else if (row.observation) {
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(...muted); pdf.text("Observação", left, y); y += 5; y += text(row.observation, left, y, right - left, 9, ink) + 4;
    }
    if (y + 12 > height - 28) newPage();
    pdf.setFillColor(...burgundy); pdf.roundedRect(left, y, right - left, 8, 2, 2, "F"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(255, 255, 255); pdf.text(row.items.length > 1 ? "GARRAFAS MOVIMENTADAS" : "GARRAFA MOVIMENTADA", left + 4, y + 5.2); y += 8;
    pdf.setFillColor(243, 238, 240); pdf.rect(left, y, right - left, 7, "F"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.setTextColor(...muted); pdf.text("FOTO", left + 4, y + 4.6); pdf.text("GARRAFA", left + 28, y + 4.6); pdf.text("QTD.", right - 4, y + 4.6, { align: "right" }); y += 7;
    for (const item of row.items) {
      const image = await imageData(item.image); const itemWidth = right - left - 54; const lineCount = pdf.splitTextToSize(item.name, itemWidth).length; const rowHeight = Math.max(20, lineCount * 4.8 + 9); if (y + rowHeight > height - 28) { newPage(); pdf.setFillColor(...burgundy); pdf.roundedRect(left, y, right - left, 8, 2, 2, "F"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(255, 255, 255); pdf.text("GARRAFAS MOVIMENTADAS · CONTINUAÇÃO", left + 4, y + 5.2); y += 8; }
      pdf.setDrawColor(225, 216, 219); pdf.setFillColor(255, 255, 255); pdf.rect(left, y, right - left, rowHeight, "FD");
      if (image) { try { pdf.addImage(image, image.startsWith("data:image/jpeg") ? "JPEG" : "PNG", left + 5, y + 2.5, 14, 15, undefined, "FAST"); } catch { /* imagem opcional */ } }
      else { pdf.setFillColor(245, 239, 241); pdf.roundedRect(left + 5, y + 3, 14, 14, 1, 1, "F"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(...burgundy); pdf.text("—", left + 12, y + 11.5, { align: "center" }); }
      text(item.name, left + 25, y + 7, itemWidth, 9, ink, "bold"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(...burgundy); pdf.text(String(item.quantity), right - 5, y + rowHeight / 2 + 2, { align: "right" });
      y += rowHeight;
    }
    y += 7;
  }
  const pages = pdf.getNumberOfPages(); for (let page = 1; page <= pages; page += 1) { pdf.setPage(page); footer(page, pages); }
  pdf.save(`${title.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-${dateForFile()}.pdf`);
}

export function MovementReport({ movements }: { movements: Movement[] }) {
  const [filter, setFilter] = useState<"all" | "entrada" | "saida">("all"); const [query, setQuery] = useState(""); const [selected, setSelected] = useState<ReportRow | null>(null); const [generating, setGenerating] = useState(false); const [exportMessage, setExportMessage] = useState("");
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
  const exportPeriod = async () => { const selectedRows = rows.filter((row) => filter === "all" || row.kind === filter); if (!selectedRows.length) return setExportMessage(`Não há ${reportLabel} registradas para gerar o relatório.`); setGenerating(true); setExportMessage(""); try { await createPdf(`Relatório de ${reportLabel}`, selectedRows); } catch { setExportMessage("Não foi possível gerar o PDF. Tente novamente."); } finally { setGenerating(false); } };
  return <section className="movement-report"><div className="movement-summary"><article><span>Entradas registradas</span><strong>{entries}</strong></article><article><span>Saídas registradas</span><strong>{exits}</strong></article><article><span>Lançamentos</span><strong>{rows.length}</strong></article></div><div className="movement-toolbar"><div className="movement-filters"><button className={filter === "all" ? "active" : ""} type="button" onClick={() => setFilter("all")}>Tudo</button><button className={filter === "entrada" ? "active" : ""} type="button" onClick={() => setFilter("entrada")}>Entradas</button><button className={filter === "saida" ? "active" : ""} type="button" onClick={() => setFilter("saida")}>Saídas</button></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por destino, garrafa ou observação" /></div><div className="report-export"><div><p>RELATÓRIO PARA IMPRESSÃO</p><strong>Gerar PDF de todas as {reportLabel}</strong></div><button type="button" onClick={exportPeriod} disabled={generating}>{generating ? "Gerando..." : "Gerar PDF"}</button>{exportMessage && <span>{exportMessage}</span>}</div>{shown.length ? <div className="movement-table"><div className="movement-table-head"><span>Data e hora</span><span>Tipo</span><span>Destino / título</span><span>Qtd.</span><span>Observação</span></div>{shown.map((row) => <button className="movement-row" type="button" key={row.id} onClick={() => setSelected(row)}><time>{formatDate(row.occurredAt)}</time><span className={`movement-kind ${row.kind}`}>{row.kind === "entrada" ? "Entrada" : "Saída"}</span><strong>{row.title}</strong><b>{row.quantity}</b><p>{row.observation ? `Obs.: ${row.observation}` : row.items.length > 1 ? `${row.items.length} rótulos na saída` : row.items[0]?.name || "—"}</p></button>)}</div> : <div className="movement-empty"><strong>Nenhuma movimentação encontrada.</strong><span>Os próximos registros de entrada e saída aparecerão aqui.</span></div>}{selected && <div className="movement-detail-overlay" role="dialog" aria-modal="true" aria-label="Detalhes da movimentação"><section className="movement-detail"><div className="movement-detail-heading"><div><p>{formatDate(selected.occurredAt)}</p><h3>{selected.title}</h3></div><button type="button" onClick={() => setSelected(null)}>Fechar</button></div><div className="movement-detail-meta"><span className={`movement-kind ${selected.kind}`}>{selected.kind === "entrada" ? "Entrada" : "Saída"}</span><strong>{selected.quantity} garrafa{selected.quantity !== 1 ? "s" : ""}</strong></div>{selected.observation && <div className="movement-observation"><b>Observação</b><p>{selected.observation}</p></div>}<div className="movement-items"><h4>{selected.items.length > 1 ? "Garrafas desta saída" : "Garrafa movimentada"}</h4>{selected.items.map((item, index) => <article key={`${item.name}-${index}`}>{item.image ? <img src={item.image} alt={`Garrafa ${item.name}`} /> : <span className="movement-bottle-placeholder">🍷</span>}<strong>{item.name}</strong><b>{item.quantity}</b></article>)}</div><button className="movement-pdf-button" type="button" onClick={exportSelected} disabled={generating}>{generating ? "Gerando PDF..." : "Gerar PDF detalhado"}</button>{exportMessage && <p className="movement-pdf-message">{exportMessage}</p>}</section></div>}</section>;
}
