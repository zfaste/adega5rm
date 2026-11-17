import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const summary = [
  { label: "Vinhos cadastrados", value: "0", detail: "rótulos no acervo" },
  { label: "Garrafas em estoque", value: "0", detail: "unidades disponíveis" },
  { label: "Estoque baixo", value: "0", detail: "itens para verificar" },
];

export default async function Painel() {
  const cookieStore = await cookies();
  if (!cookieStore.get("adega_access_token")) redirect("/");

  return <main className="dashboard-page">
    <aside className="dashboard-sidebar">
      <div className="sidebar-brand"><img src="/brand/gabinete-5rm-bordo.png" alt="Símbolo da 5ª Região Militar" /><div><strong>Adega 5ª RM</strong><span>Controle de vinhos</span></div></div>
      <nav aria-label="Navegação principal"><a className="active" href="/painel"><span>▦</span> Painel</a><a href="#relacao"><span>☷</span> Relação de vinhos</a></nav>
      <p className="sidebar-note">GESTÃO INSTITUCIONAL<br />ACESSO RESTRITO</p>
    </aside>
    <section className="dashboard-content">
      <header className="dashboard-header"><div><p>VISÃO GERAL</p><h1>Painel da Adega</h1></div><div className="status"><i /> Sistema ativo</div></header>
      <section className="summary-grid" aria-label="Resumo do estoque">{summary.map((item) => <article className="summary-card" key={item.label}><p>{item.label}</p><strong>{item.value}</strong><span>{item.detail}</span></article>)}</section>
      <section className="wine-list" id="relacao"><div className="section-heading"><div><p>CONTROLE DE ESTOQUE</p><h2>Relação de vinhos</h2></div><span>Atualizado agora</span></div><div className="table-wrap"><table><thead><tr><th>Nome do vinho</th><th>Tipo</th><th>Safra</th><th>Origem</th><th>Quantidade</th><th>Status</th></tr></thead><tbody><tr><td colSpan={6}><div className="empty-state"><strong>Nenhum vinho cadastrado</strong><span>Quando os vinhos forem adicionados, eles aparecerão nesta relação.</span></div></td></tr></tbody></table></div></section>
    </section>
  </main>;
}
