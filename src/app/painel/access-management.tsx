"use client";

import { useEffect, useState } from "react";

type Role = "admin" | "operator" | "viewer";
type Member = { user_id: string; email: string; role: Role; is_active: boolean; created_at: string };
type AccessRequest = { id: string; email: string; requested_at: string };

const labels: Record<Role, string> = { admin: "Administrador", operator: "Operador", viewer: "Consulta" };

export function AccessManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("operator");
  const [message, setMessage] = useState("Carregando perfis...");
  const [saving, setSaving] = useState(false);

  const request = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { response, data: await response.json() as { members?: Member[]; requests?: AccessRequest[]; message?: string; error?: string } };
  };
  const load = async () => {
    const { response, data } = await request({ action: "list" });
    if (!response.ok) return setMessage(data.error ?? "Não foi possível carregar os perfis.");
    setMembers(data.members ?? []); setRequests(data.requests ?? []); setMessage("");
  };
  useEffect(() => { void load(); }, []);
  const invite = async (targetEmail = email) => {
    setSaving(true); setMessage("");
    const { response, data } = await request({ action: "invite", email: targetEmail, role });
    setSaving(false);
    if (!response.ok) return setMessage(data.error ?? "Não foi possível liberar o acesso.");
    setEmail(""); setMessage(data.message ?? "Acesso liberado."); void load();
  };
  const update = async (member: Member, patch: Partial<Pick<Member, "role" | "is_active">>) => {
    setSaving(true); setMessage("");
    const { response, data } = await request({ action: "update", userId: member.user_id, role: patch.role ?? member.role, isActive: patch.is_active ?? member.is_active });
    setSaving(false);
    if (!response.ok) return setMessage(data.error ?? "Não foi possível atualizar o perfil.");
    setMessage(data.message ?? "Perfil atualizado."); void load();
  };
  const reject = async (accessRequest: AccessRequest) => {
    setSaving(true); setMessage("");
    const { response, data } = await request({ action: "reject-request", userId: accessRequest.id });
    setSaving(false);
    if (!response.ok) return setMessage(data.error ?? "Não foi possível recusar a solicitação.");
    setMessage(data.message ?? "Solicitação recusada."); void load();
  };

  return <section className="access-management">
    <div className="section-heading"><div><p>ACESSO INSTITUCIONAL</p><h2>Perfis e permissões</h2><span>Administradores gerenciam acessos; operadores movimentam o estoque; consulta apenas visualiza.</span></div></div>
    <div className="invite-member"><label>E-mail institucional<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@exemplo.mil.br" /></label><label>Perfil<select value={role} onChange={(event) => setRole(event.target.value as Role)}>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><button type="button" disabled={saving || !email.trim()} onClick={() => void invite()}>{saving ? "Liberando..." : "Liberar acesso"}</button></div>
    {message && <p className="access-message">{message}</p>}
    {requests.length > 0 && <div className="access-requests"><div><p>PEDIDOS PENDENTES</p><h3>Solicitações de acesso</h3></div>{requests.map((accessRequest) => <article key={accessRequest.id}><div><strong>{accessRequest.email}</strong><span>Solicitado em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(accessRequest.requested_at))}</span></div><button type="button" disabled={saving} onClick={() => void invite(accessRequest.email)}>Aprovar como {labels[role]}</button><button type="button" className="member-status" disabled={saving} onClick={() => void reject(accessRequest)}>Recusar</button></article>)}</div>}
    <div className="member-list">{members.map((member) => <article key={member.user_id}><div><strong>{member.email}</strong><span>{member.is_active ? "Acesso ativo" : "Acesso suspenso"}</span></div><label>Perfil<select value={member.role} disabled={saving} onChange={(event) => void update(member, { role: event.target.value as Role })}>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><button type="button" className="member-status" disabled={saving} onClick={() => void update(member, { is_active: !member.is_active })}>{member.is_active ? "Suspender" : "Reativar"}</button></article>)}</div>
  </section>;
}
