import { BarChart3, Box, ClipboardList, Grid2X2, LogOut, Settings, Wine } from "lucide-react";

const items = [["Início", Grid2X2, "/"], ["Meus vinhos", Wine, "/vinhos"], ["Adega 3D", Box, "/locais"], ["Estatísticas", BarChart3, "/relatorios"], ["Operações", ClipboardList, "/operacao"]] as const;

export function OperationalSidebar({ active }: { active: string }) {
  return <aside className="fixed inset-y-0 left-0 hidden w-56 border-r border-[#eceef1] bg-white px-4 py-6 md:block"><div className="mb-9 flex items-center gap-2 px-1"><span className="h-9 w-9 bg-[url('/brand/gabinete-5rm.png')] bg-contain bg-center bg-no-repeat"/><b className="text-xl text-zinc-900">Adega</b></div><nav className="space-y-1">{items.map(([label, Icon, href]) => <a key={label} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${active === href ? "bg-[#f0f1f2] text-zinc-800" : "text-[#999ba2] hover:bg-[#f7f7f8] hover:text-zinc-800"}`}><Icon size={22}/>{label}</a>)}</nav><div className="absolute inset-x-4 bottom-6"><a href="/operacao" className="flex items-center gap-3 px-3 py-3 text-sm text-[#999ba2]"><Settings size={20}/>Configurações</a><a href="/" className="flex items-center gap-3 px-3 py-3 text-sm text-[#999ba2]"><LogOut size={20}/>Voltar ao painel</a></div></aside>;
}
