"use client";

import { ChangeEvent, useState } from "react";

export function WineImporter() {
  const [file, setFile] = useState<File | null>(null); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  const select = (event: ChangeEvent<HTMLInputElement>) => { setFile(event.target.files?.[0] || null); setMessage(""); };
  const upload = async () => {
    if (!file) return setMessage("Selecione o arquivo CSV para continuar.");
    setLoading(true); const form = new FormData(); form.append("file", file);
    const response = await fetch("/api/wines", { method: "POST", body: form }); const data = await response.json(); setLoading(false);
    if (!response.ok) return setMessage(data.error);
    setMessage(`${data.records} vinhos e ${data.stock} garrafas importados.`); setTimeout(() => window.location.reload(), 900);
  };
  return <div className="import-control"><input aria-label="Arquivo CSV de vinhos" type="file" accept=".csv,text/csv" onChange={select} /><button type="button" onClick={upload} disabled={loading}>{loading ? "Importando..." : "Importar CSV"}</button>{message && <p>{message}</p>}</div>;
}
