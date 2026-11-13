"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Search, Wine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type WineRow = {
  id: string;
  name: string;
  producer: string | null;
  brand: string | null;
  wine_type: string;
  vintage: number | null;
  region: string | null;
  country: string | null;
  grapes: string[] | null;
  maturity_stage: string | null;
  estimated_value: number | null;
};

export default function VinhosPage() {
  const db = useMemo(createClient, []);
  const [wines, setWines] = useState<WineRow[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("Todos");

  useEffect(() => {
    db.from("wines").select("id,name,producer,brand,wine_type,vintage,region,country,grapes,maturity_stage,estimated_value").eq("active", true).order("name")
      .then(({ data }) => setWines((data as WineRow[] | null) ?? []));
  }, [db]);

  const filtered = wines.filter((wine) => {
    const text = `${wine.name} ${wine.producer ?? ""} ${wine.brand ?? ""} ${wine.region ?? ""}`.toLocaleLowerCase();
    return text.includes(search.toLocaleLowerCase()) && (type === "Todos" || wine.wine_type === type);
  });

  return <main className="min-h-screen bg-[#f4f8ef] p-5 md:ml-64 md:p-10">
    <a href="/" className="text-sm text-[#24542c]">← Voltar à Adega</a>
    <header className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-[#d9e4d5] pb-5">
      <div><p className="text-sm font-medium text-[#24542c]">Acervo institucional</p><h1 className="text-3xl font-semibold">Meus vinhos</h1></div>
      <a className="btn" href="/scanner">Cadastrar com scanner</a>
    </header>
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#d9e4d5] bg-white p-4 sm:flex-row">
      <label className="flex flex-1 items-center gap-2"><Search size={18}/><input className="border-0 !p-1 focus:ring-0" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Procure por vinho, produtor ou região" /></label>
      <label className="flex items-center gap-2 text-sm"><Filter size={17}/><select value={type} onChange={(e) => setType(e.target.value)} className="w-40 py-2"><option>Todos</option><option>Tinto</option><option>Branco</option><option>Rosé</option><option>Espumante</option><option>Fortificado</option></select></label>
    </div>
    <p className="mt-5 text-sm text-zinc-500">{filtered.length} rótulo(s) encontrado(s)</p>
    <section className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((wine) => <article key={wine.id} className="rounded-2xl border border-[#d9e4d5] bg-white p-5 shadow-sm">
      <Wine className="text-[#24542c]"/><div className="mt-4 flex items-start justify-between gap-2"><div><p className="text-xs text-zinc-500">{wine.producer ?? wine.brand ?? "Produtor não informado"}</p><h2 className="font-semibold">{wine.name}</h2></div>{wine.vintage && <span className="rounded-full bg-[#edf4e7] px-2 py-1 text-xs">{wine.vintage}</span>}</div>
      <p className="mt-3 text-sm text-zinc-600">{[wine.wine_type, wine.region, wine.country].filter(Boolean).join(" · ")}</p>
      {wine.grapes?.length ? <p className="mt-2 text-sm text-zinc-500">{wine.grapes.join(", ")}</p> : null}
      <div className="mt-4 flex items-center justify-between border-t pt-3 text-sm"><span>{wine.maturity_stage ?? "Maturidade não informada"}</span><b>{wine.estimated_value ? wine.estimated_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Valor a apurar"}</b></div>
    </article>)}</section>
    {!filtered.length && <div className="mt-10 rounded-2xl border border-dashed border-[#cbd9c4] p-10 text-center text-zinc-500">Nenhum vinho corresponde aos filtros. Cadastre um rótulo pela operação diária ou pelo scanner.</div>}
  </main>;
}
