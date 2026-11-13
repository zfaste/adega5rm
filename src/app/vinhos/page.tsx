"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Plus, Search, SlidersHorizontal, Wine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { OperationalSidebar } from "@/components/operational-sidebar";

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

  return <div className="min-h-screen bg-white"><OperationalSidebar active="/vinhos"/><main className="md:ml-56"><header className="flex min-h-[86px] flex-wrap items-center justify-between gap-3 border-b border-[#f0f1f2] px-5 py-4 md:px-7"><div><p className="text-sm font-medium text-[#236135]">Acervo institucional</p><h1 className="text-3xl font-bold text-zinc-800">Meus vinhos</h1></div><a className="oeni-button" href="/scanner"><Plus size={18}/>Adicionar vinho</a></header><div className="px-5 py-6 md:px-7"><div className="flex flex-col gap-3 rounded-2xl bg-[#f6f7f8] p-3 lg:flex-row"><label className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3"><Search size={19} className="text-zinc-400"/><input className="border-0 bg-transparent !p-2 focus:ring-0" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Procure um vinho no acervo" /></label><label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium"><SlidersHorizontal size={17}/><select value={type} onChange={(e) => setType(e.target.value)} className="w-40 border-0 bg-transparent !p-2 focus:ring-0"><option>Todos</option><option>Tinto</option><option>Branco</option><option>Rosé</option><option>Espumante</option><option>Fortificado</option></select></label></div><div className="mt-6 flex items-center justify-between"><p className="text-sm oeni-muted">{filtered.length} rótulo(s) encontrado(s)</p><span className="hidden text-sm text-zinc-500 sm:flex sm:items-center sm:gap-2"><Filter size={16}/>Filtro ativo: {type}</span></div><section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((wine) => <article key={wine.id} className="oeni-card group flex gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-md"><div className="grid h-24 w-20 shrink-0 place-items-center rounded-xl bg-[linear-gradient(155deg,#285e35,#7eb05f)]"><Wine className="text-white" size={28}/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs oeni-muted">{wine.producer ?? wine.brand ?? "Produtor não informado"}</p><h2 className="mt-1 font-bold text-zinc-800">{wine.name}</h2></div>{wine.vintage && <span className="rounded-full bg-[#eaf3e6] px-2 py-1 text-xs font-bold text-[#236135]">{wine.vintage}</span>}</div><p className="mt-3 text-sm text-zinc-600">{[wine.wine_type, wine.region, wine.country].filter(Boolean).join(" · ")}</p>{wine.grapes?.length ? <p className="mt-1 truncate text-sm oeni-muted">{wine.grapes.join(", ")}</p> : null}<div className="mt-3 flex items-center justify-between border-t border-[#edf0ed] pt-3 text-xs"><span className="text-[#236135]">{wine.maturity_stage ?? "Maturidade a avaliar"}</span><b>{wine.estimated_value ? wine.estimated_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Valor a apurar"}</b></div></div></article>)}</section>{!filtered.length && <div className="mt-10 rounded-2xl border border-dashed border-[#dfe7dc] p-12 text-center text-zinc-500"><Wine className="mx-auto mb-3 text-[#236135]"/>Nenhum vinho corresponde aos filtros. Use o scanner para registrar o primeiro rótulo.</div>}</div></main></div>;
}
