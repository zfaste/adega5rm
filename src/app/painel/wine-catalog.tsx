"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

type SearchResult = { id: string; name: string; winery?: string | null; vintage?: number | null; grape?: string | null; type?: string | null; country?: string | null; volumeMl?: number | null; price?: number | null; priceLabel?: string | null; imageUrl?: string | null; provider: string; sourceUrl?: string | null; license?: string | null };
const blank = { name: "", winery: "", vintage: "", grape: "", type: "", country: "", volumeMl: "750", referencePrice: "", quantity: "0", location: "", minimumStock: "0", notes: "", imageUrl: "", imageSource: "", imageLicense: "", sourceProvider: "Manual", sourceUrl: "" };

const normalizeBottle = async (source: Blob) => new Promise<Blob>((resolve) => {
  const image = new Image(); const imageUrl = URL.createObjectURL(source);
  image.onload = () => {
    const sourceCanvas = document.createElement("canvas"); sourceCanvas.width = image.naturalWidth; sourceCanvas.height = image.naturalHeight;
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    if (!sourceContext) { URL.revokeObjectURL(imageUrl); resolve(source); return; }
    sourceContext.drawImage(image, 0, 0); const pixels = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
    let left = sourceCanvas.width; let top = sourceCanvas.height; let right = -1; let bottom = -1;
    for (let y = 0; y < sourceCanvas.height; y += 1) for (let x = 0; x < sourceCanvas.width; x += 1) { if (pixels[(y * sourceCanvas.width + x) * 4 + 3] > 32) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); } }
    if (right < left || bottom < top) { URL.revokeObjectURL(imageUrl); resolve(source); return; }
    let cropWidth = (right - left + 1) * 1.18; let cropHeight = (bottom - top + 1) * 1.08; const targetRatio = 3 / 5;
    if (cropWidth / cropHeight < targetRatio) cropWidth = cropHeight * targetRatio; else cropHeight = cropWidth / targetRatio;
    cropWidth = Math.min(cropWidth, sourceCanvas.width); cropHeight = Math.min(cropHeight, sourceCanvas.height);
    const centerX = (left + right) / 2; const centerY = (top + bottom) / 2;
    const cropX = Math.max(0, Math.min(sourceCanvas.width - cropWidth, centerX - cropWidth / 2)); const cropY = Math.max(0, Math.min(sourceCanvas.height - cropHeight, centerY - cropHeight / 2));
    const output = document.createElement("canvas"); output.width = 900; output.height = 1500;
    output.getContext("2d")?.drawImage(sourceCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, output.width, output.height);
    output.toBlob((blob) => { URL.revokeObjectURL(imageUrl); resolve(blob || source); }, "image/png");
  };
  image.onerror = () => { URL.revokeObjectURL(imageUrl); resolve(source); }; image.src = imageUrl;
});

const resizeForProcessing = async (source: Blob) => new Promise<Blob>((resolve) => {
  const image = new Image(); const sourceUrl = URL.createObjectURL(source);
  image.onload = () => {
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    if (longestSide <= 1280) { URL.revokeObjectURL(sourceUrl); resolve(source); return; }
    const scale = 1280 / longestSide; const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => { URL.revokeObjectURL(sourceUrl); resolve(blob || source); }, "image/jpeg", .9);
  };
  image.onerror = () => { URL.revokeObjectURL(sourceUrl); resolve(source); }; image.src = sourceUrl;
});

export function WineCatalog() {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const [results, setResults] = useState<SearchResult[]>([]); const [form, setForm] = useState(blank); const [photo, setPhoto] = useState<File | null>(null); const [preview, setPreview] = useState(""); const [message, setMessage] = useState(""); const [searching, setSearching] = useState(false); const [saving, setSaving] = useState(false); const [cameraOpen, setCameraOpen] = useState(false); const [cameraMessage, setCameraMessage] = useState(""); const [processingPhoto, setProcessingPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null); const streamRef = useRef<MediaStream | null>(null);
  const set = (key: keyof typeof blank, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const stopCamera = () => { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setCameraOpen(false); };
  useEffect(() => () => { streamRef.current?.getTracks().forEach((track) => track.stop()); }, []);
  useEffect(() => {
    const video = videoRef.current; const stream = streamRef.current;
    if (!cameraOpen || !video || !stream) return;
    video.srcObject = stream;
    const play = async () => { try { await video.play(); setCameraMessage(""); } catch { setCameraMessage("A câmera foi autorizada, mas não iniciou. Toque em Fechar e tente novamente."); } };
    video.onloadedmetadata = () => { void play(); };
    video.oncanplay = () => { void play(); };
    if (video.readyState >= 2) void play();
    return () => { video.onloadedmetadata = null; video.oncanplay = null; video.srcObject = null; };
  }, [cameraOpen]);
  const removeBackground = async (source: Blob) => {
    setProcessingPhoto(true); setCameraMessage("Preparando a garrafa e removendo o fundo...");
    try {
      const { removeBackground: cutout } = await import("@imgly/background-removal");
      const prepared = await resizeForProcessing(source);
      const result = await cutout(prepared, { model: "isnet_quint8", output: { format: "image/png", quality: 1 }, progress: () => setCameraMessage("Removendo o fundo — isto pode levar alguns instantes na primeira foto.") });
      const normalized = await normalizeBottle(result); const file = new File([normalized], "garrafa-sem-fundo.png", { type: "image/png" });
      setPhoto(file); setPreview(URL.createObjectURL(normalized)); set("imageUrl", ""); setCameraMessage("Foto pronta: a garrafa foi centralizada e isolada com fundo transparente.");
    } catch {
      const fallback = new File([source], "garrafa-original.jpg", { type: source.type || "image/jpeg" });
      setPhoto(fallback); setPreview(URL.createObjectURL(source)); set("imageUrl", ""); setCameraMessage("Não foi possível remover o fundo nesta tentativa. A foto original foi mantida para você não perder o registro.");
    } finally { setProcessingPhoto(false); }
  };
  const warmBackgroundModel = () => { void import("@imgly/background-removal").then(({ preload }) => preload({ model: "isnet_quint8" })).catch(() => undefined); };
  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0] || null; if (file) await removeBackground(file); event.target.value = ""; };
  const openCamera = async () => {
    setCameraMessage(""); warmBackgroundModel();
    if (!navigator.mediaDevices?.getUserMedia) return setCameraMessage("A câmera não é suportada neste navegador. Use o envio da galeria.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" }, aspectRatio: { ideal: 9 / 16 }, width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: false });
      streamRef.current = stream; setCameraOpen(true);
    } catch { setCameraMessage("Não conseguimos acessar a câmera. Confira a permissão do navegador ou envie uma foto da galeria."); }
  };
  const captureBottle = async () => {
    const video = videoRef.current; if (!video?.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const captured = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.94));
    stopCamera(); if (captured) await removeBackground(captured);
  };
  const search = async () => { if (query.trim().length < 3) return setMessage("Digite pelo menos 3 caracteres para pesquisar."); setSearching(true); setMessage(""); const response = await fetch(`/api/wine-search?q=${encodeURIComponent(query)}`); const data = await response.json(); setSearching(false); if (!response.ok) return setMessage(data.error || "Não foi possível pesquisar agora."); setResults(data.results); if (!data.results.length) setMessage("Nenhuma sugestão foi encontrada. Você pode preencher manualmente."); };
  const select = (item: SearchResult) => { setForm({ ...blank, name: item.name || "", winery: item.winery || "", vintage: item.vintage ? String(item.vintage) : "", grape: item.grape || "", type: item.type || "", country: item.country || "", volumeMl: item.volumeMl ? String(item.volumeMl) : "750", referencePrice: item.price ? String(item.price) : "", imageUrl: item.imageUrl || "", imageSource: item.provider, imageLicense: item.license || "", sourceProvider: item.provider, sourceUrl: item.sourceUrl || "" }); setResults([]); setMessage(item.price ? `Dados preenchidos a partir de ${item.provider}. Preço sugerido: ${item.priceLabel}; confirme antes de salvar.` : `Dados preenchidos a partir de ${item.provider}. O preço de referência não foi preenchido porque a busca não retornou uma oferta em R$ confiável.`); };
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setMessage(""); const body = new FormData(); body.append("action", "create"); Object.entries(form).forEach(([key, value]) => body.append(key, value)); if (photo) body.append("photo", photo); const response = await fetch("/api/wines", { method: "POST", body }); const data = await response.json(); setSaving(false); if (!response.ok) return setMessage(data.error || "Não foi possível salvar o vinho."); setMessage("Vinho cadastrado com sucesso."); setTimeout(() => window.location.reload(), 700); };
  return <section className="catalog-panel"><div className="catalog-header"><div><p>CATÁLOGO INTELIGENTE</p><h2>Identifique e adicione um vinho</h2><span>Pesquise em uma fonte aberta ou preencha os dados manualmente.</span></div><button className="catalog-open" onClick={() => setOpen((value) => !value)}>{open ? "Fechar cadastro" : "+ Adicionar vinho"}</button></div>{open && <div className="catalog-body"><div className="catalog-search"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), search())} placeholder="Ex.: Catena Zapata Malbec Argentino 2022" /><button type="button" onClick={search} disabled={searching}>{searching ? "Pesquisando..." : "Pesquisar"}</button></div>{results.length > 0 && <div className="search-results">{results.map((item) => <button className="search-result" type="button" key={item.id} onClick={() => select(item)}>{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <div className="empty-bottle">🍷</div>}<span><b>{item.name}</b><small>{[item.winery, item.vintage, item.country, item.volumeMl && `${item.volumeMl} ml`].filter(Boolean).join(" · ") || "Dados parciais"}</small><em>{item.priceLabel ? `Oferta: ${item.priceLabel} · ` : ""}{item.provider}</em></span></button>)}</div>}<form className="wine-form" onSubmit={submit}><div className="form-grid"><label>Nome do vinho<input required value={form.name} onChange={(event) => set("name", event.target.value)} /></label><label>Vinícola<input value={form.winery} onChange={(event) => set("winery", event.target.value)} /></label><label>Safra<input type="number" min="1800" max="2100" value={form.vintage} onChange={(event) => set("vintage", event.target.value)} /></label><label>Uva<input value={form.grape} onChange={(event) => set("grape", event.target.value)} /></label><label>Tipo<input placeholder="Tinto, branco, espumante..." value={form.type} onChange={(event) => set("type", event.target.value)} /></label><label>País<input value={form.country} onChange={(event) => set("country", event.target.value)} /></label><label>Volume (ml)<input type="number" min="1" value={form.volumeMl} onChange={(event) => set("volumeMl", event.target.value)} /></label><label>Preço de referência<input type="number" min="0" step="0.01" value={form.referencePrice} onChange={(event) => set("referencePrice", event.target.value)} /></label><label>Quantidade em estoque<input required type="number" min="0" value={form.quantity} onChange={(event) => set("quantity", event.target.value)} /></label><label>Localização interna<input list="wine-locations" placeholder="Ex.: Adega 5ª RM" value={form.location} onChange={(event) => set("location", event.target.value)} /><datalist id="wine-locations"><option value="Adega 5ª RM" /><option value="BSup" /></datalist></label></div><div className="photo-field"><div>{preview || form.imageUrl ? <img src={preview || form.imageUrl} alt="Prévia da garrafa" /> : <div className="image-placeholder">Foto da garrafa</div>}<div className="photo-actions"><button className="camera-button" type="button" onClick={openCamera} disabled={processingPhoto}>Usar câmera</button><label className="file-button" onClick={warmBackgroundModel}>Enviar da galeria<input type="file" accept="image/*" onChange={choosePhoto} /></label></div></div><p>Fotografe com a garrafa inteira dentro da silhueta. O fundo é removido no próprio navegador e o arquivo final fica com transparência.</p></div>{cameraMessage && <p className="camera-message">{cameraMessage}</p>}<label>Observações<textarea value={form.notes} onChange={(event) => set("notes", event.target.value)} placeholder="Notas de compra, condição da garrafa ou outras informações." /></label><input type="hidden" value={form.imageUrl} readOnly /><button className="catalog-save" disabled={saving || processingPhoto}>{saving ? "Salvando..." : processingPhoto ? "Preparando foto..." : "Salvar vinho no estoque"}</button>{message && <p className="catalog-message">{message}</p>}</form></div>}{cameraOpen && <div className="camera-overlay" role="dialog" aria-modal="true" aria-label="Fotografar garrafa"><div className="camera-frame"><div className="camera-heading"><div><p>FOTO DA GARRAFA</p><h3>Centralize a garrafa na silhueta</h3></div><button type="button" onClick={stopCamera}>Fechar</button></div><div className="camera-view"><video ref={videoRef} autoPlay playsInline muted /><div className="bottle-guide" aria-hidden="true"><svg viewBox="0 0 120 280"><path d="M49 10h22v42c0 12 8 22 18 32 13 13 17 31 17 60v109c0 12-8 17-18 17H32c-10 0-18-5-18-17V144c0-29 4-47 17-60 10-10 18-20 18-32V10Z" /></svg></div><span>Enquadre do topo ao fundo da garrafa</span></div><div className="camera-footer"><p>Use boa luz e deixe um pouco de espaço ao redor da garrafa.</p><button className="capture-button" type="button" onClick={captureBottle}>Capturar foto</button></div></div></div>}</section>;
}
