import { BarChart3, ClipboardCheck, MapPin, ScanLine, Settings2, Wine } from "lucide-react";
const links=[
  ["/","Operação diária","Cadastre vinhos, entradas, saídas e consulte movimentações.",Wine],
  ["/locais","Locais e prateleiras","Organize a adega física e os níveis mínimos.",MapPin],
  ["/inventario","Inventário","Compare o saldo físico com o estoque registrado.",ClipboardCheck],
  ["/relatorios","Relatórios","Consulte o estoque e exporte em CSV.",BarChart3],
  ["/scanner","Scanner de vinhos","Registre leituras por código ou busca para revisão do rótulo.",ScanLine],
  ["/vinhos","Catálogo rico","Consulte rótulos, origem, uvas, maturidade e valor estimado.",Wine],
];
export default function Operacao(){return <main className="min-h-screen bg-wine-950 p-5 text-stone-100 md:p-10"><div className="mx-auto max-w-5xl"><a href="/" className="text-sm text-gold-400">← Voltar à Adega</a><header className="mb-8 mt-4"><p className="text-sm text-gold-400">Centro de operações</p><h1 className="text-3xl font-semibold">Gestão da Adega</h1><p className="mt-2 text-stone-400">Acesse os módulos institucionais conforme sua atribuição.</p></header><section className="grid gap-4 sm:grid-cols-2">{links.map(([href,title,description,Icon])=>{const I=Icon as typeof Wine;return <a key={href as string} href={href as string} className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-gold-400/50 hover:bg-white/10"><I className="text-gold-400"/><h2 className="mt-5 text-lg font-semibold">{title as string}</h2><p className="mt-1 text-sm text-stone-400">{description as string}</p></a>})}</section><section className="mt-6 rounded-2xl bg-cellar-900 p-6"><Settings2 className="text-gold-400"/><h2 className="mt-3 font-semibold">Sequência recomendada</h2><p className="mt-1 text-sm text-stone-300">Cadastre os locais, registre os vinhos e suas entradas, consulte o estoque, efetue as saídas e execute o inventário periodicamente.</p></section></div></main>}
