"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ClipboardPenLine, Star, Wine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type WineItem = { id: string; name: string; producer: string | null; wine_type: string };
type Review = { id: string; rating: number | null; aroma: string | null; flavor: string | null; pairing: string | null; notes: string | null; created_at: string; wines: { name: string } | null };

export default function DegustacoesPage() {
  const db = useMemo(createClient, []);
  const [wines, setWines] = useState<WineItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [wineId, setWineId] = useState("");
  const [rating, setRating] = useState("8");
  const [aroma, setAroma] = useState("");
  const [flavor, setFlavor] = useState("");
  const [pairing, setPairing] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const refresh = async () => {
    const [wineResult, reviewResult] = await Promise.all([
      db.from("wines").select("id,name,producer,wine_type").eq("active", true).order("name"),
      db.from("tasting_reviews").select("id,rating,aroma,flavor,pairing,notes,created_at,wines(name)").order("created_at", { ascending: false }).limit(25),
    ]);
    setWines((wineResult.data as WineItem[] | null) ?? []);
    setReviews((reviewResult.data as unknown as Review[] | null) ?? []);
  };
  useEffect(() => { refresh(); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage("");
    const { data: { user } } = await db.auth.getUser();
    if (!user) return setMessage("Faça login para registrar uma degustação.");
    const { error } = await db.from("tasting_reviews").insert({ wine_id: wineId, reviewer_id: user.id, rating: Number(rating), aroma: aroma || null, flavor: flavor || null, pairing: pairing || null, notes: notes || null });
    if (error) return setMessage(error.message);
    setAroma(""); setFlavor(""); setPairing(""); setNotes(""); setMessage("Degustação registrada no histórico."); await refresh();
  };

  return <main className="min-h-screen bg-[#f4f8ef] p-5 md:ml-64 md:p-10"><a href="/" className="text-sm text-[#24542c]">← Voltar à Adega</a>
    <header className="mt-5 border-b border-[#d9e4d5] pb-5"><p className="text-sm font-medium text-[#24542c]">Conhecimento do acervo</p><h1 className="text-3xl font-semibold">Degustações e avaliações</h1><p className="mt-2 text-zinc-600">Registre percepções para orientar serviço, conservação e futuras aquisições.</p></header>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><form onSubmit={submit} className="rounded-2xl border border-[#d9e4d5] bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><ClipboardPenLine className="text-[#24542c]"/><h2 className="font-semibold">Nova ficha de degustação</h2></div><div className="mt-5 grid gap-4"><label className="text-sm font-medium">Vinho<select required value={wineId} onChange={e => setWineId(e.target.value)}><option value="">Selecione um rótulo</option>{wines.map(w => <option key={w.id} value={w.id}>{w.name} · {w.producer ?? w.wine_type}</option>)}</select></label><label className="text-sm font-medium">Nota geral (0 a 10)<input required type="number" min="0" max="10" step="0.5" value={rating} onChange={e => setRating(e.target.value)} /></label><label className="text-sm font-medium">Aromas<input value={aroma} onChange={e => setAroma(e.target.value)} placeholder="Ex.: frutas vermelhas, especiarias" /></label><label className="text-sm font-medium">Paladar<input value={flavor} onChange={e => setFlavor(e.target.value)} placeholder="Ex.: encorpado, taninos sedosos" /></label><label className="text-sm font-medium">Harmonização<input value={pairing} onChange={e => setPairing(e.target.value)} placeholder="Ex.: cordeiro assado" /></label><label className="text-sm font-medium">Observações<textarea className="mt-1 min-h-24 w-full rounded-xl border border-[#d5dfcd] p-3" value={notes} onChange={e => setNotes(e.target.value)} /></label></div><button className="btn mt-5"><Star size={17}/>Salvar avaliação</button>{message && <p className="mt-4 text-sm text-[#24542c]">{message}</p>}</form>
      <section><h2 className="font-semibold">Histórico recente</h2><div className="mt-4 space-y-3">{reviews.map(review => <article key={review.id} className="rounded-2xl border border-[#d9e4d5] bg-white p-5"><div className="flex justify-between gap-3"><div><Wine className="mb-2 text-[#24542c]" size={18}/><h3 className="font-semibold">{review.wines?.name ?? "Vinho"}</h3></div><b className="rounded-full bg-[#edf4e7] px-3 py-1 text-sm">{review.rating?.toFixed(1) ?? "—"}/10</b></div>{review.aroma && <p className="mt-3 text-sm"><b>Aromas:</b> {review.aroma}</p>}{review.flavor && <p className="mt-1 text-sm"><b>Paladar:</b> {review.flavor}</p>}{review.pairing && <p className="mt-1 text-sm"><b>Harmoniza:</b> {review.pairing}</p>}<p className="mt-3 text-xs text-zinc-500">{new Date(review.created_at).toLocaleString("pt-BR")}</p></article>)}</div>{!reviews.length && <p className="mt-8 rounded-2xl border border-dashed border-[#cbd9c4] p-8 text-center text-sm text-zinc-500">Ainda não existem avaliações registradas.</p>}</section></div>
  </main>;
}
