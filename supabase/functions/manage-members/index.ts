import { createClient } from "npm:@supabase/supabase-js@2";

type Role = "admin" | "operator" | "viewer";

const url = Deno.env.get("SUPABASE_URL")!;
const publishable = Deno.env.get("SUPABASE_ANON_KEY") ?? JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}").default;
const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default;
const validRoles: Role[] = ["admin", "operator", "viewer"];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const authorization = request.headers.get("Authorization");
  if (!authorization) return json({ error: "Sessão inválida." }, 401);

  const userClient = createClient(url, publishable, { global: { headers: { Authorization: authorization } } });
  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data: auth, error: authError } = await userClient.auth.getUser(token);
  if (authError || !auth.user) return json({ error: "Sessão inválida." }, 401);

  const admin = createClient(url, serviceRole);
  const { data: caller, error: callerError } = await admin
    .from("institution_members")
    .select("institution_id, role, is_active")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .eq("role", "admin")
    .maybeSingle();
  if (callerError || !caller) return json({ error: "Somente administradores podem gerenciar acessos." }, 403);

  const body = await request.json().catch(() => ({})) as { action?: string; email?: string; role?: Role; userId?: string; isActive?: boolean };
  if (body.action === "list") {
    const [{ data: members, error: membersError }, { data: users, error: usersError }] = await Promise.all([
      admin.from("institution_members").select("user_id, role, is_active, created_at").eq("institution_id", caller.institution_id).order("created_at"),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (membersError || usersError) return json({ error: "Não foi possível carregar os acessos." }, 500);
    const emailById = new Map((users.users ?? []).map((user) => [user.id, user.email ?? "E-mail não informado"]));
    return json({ members: (members ?? []).map((member) => ({ ...member, email: emailById.get(member.user_id) ?? "Convite pendente" })) });
  }

  if (body.action === "invite") {
    const email = body.email?.trim().toLocaleLowerCase();
    if (!email || !validRoles.includes(body.role ?? "viewer")) return json({ error: "Informe e-mail e perfil válidos." }, 400);
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: "https://adega5rm.vercel.app" });
    if (inviteError || !invited.user) return json({ error: inviteError?.message ?? "Não foi possível enviar o convite." }, 400);
    const { error: memberError } = await admin.from("institution_members").upsert({ institution_id: caller.institution_id, user_id: invited.user.id, role: body.role, is_active: true }, { onConflict: "institution_id,user_id" });
    if (memberError) return json({ error: "O convite foi criado, mas não foi possível definir o perfil." }, 500);
    return json({ ok: true, message: "Convite enviado e perfil definido." });
  }

  if (body.action === "update") {
    if (!body.userId || !validRoles.includes(body.role ?? "viewer") || typeof body.isActive !== "boolean") return json({ error: "Dados do perfil inválidos." }, 400);
    if (body.userId === auth.user.id && (body.role !== "admin" || !body.isActive)) return json({ error: "O administrador atual não pode remover o próprio acesso administrativo." }, 400);
    const { error } = await admin.from("institution_members").update({ role: body.role, is_active: body.isActive, updated_at: new Date().toISOString() }).eq("institution_id", caller.institution_id).eq("user_id", body.userId);
    if (error) return json({ error: "Não foi possível atualizar o perfil." }, 500);
    return json({ ok: true, message: "Perfil atualizado." });
  }

  return json({ error: "Ação inválida." }, 400);
});
