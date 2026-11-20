import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? Deno.env.get("SUPABASE_SECRET_KEY")
  ?? JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  if (!serviceRole) return json({ error: "A solicitação de acesso não está configurada." }, 503);

  const { email } = await request.json().catch(() => ({})) as { email?: string };
  const normalizedEmail = email?.trim().toLocaleLowerCase();
  if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) return json({ error: "Informe um e-mail válido." }, 400);

  const admin = createClient(url, serviceRole);
  const { data: institution, error: institutionError } = await admin.from("institutions").select("id").eq("slug", "gabinete-5rm").single();
  if (institutionError || !institution) return json({ error: "Instituição não encontrada." }, 500);
  const { error } = await admin.from("access_requests").insert({ institution_id: institution.id, email: normalizedEmail });
  if (error?.code === "23505") return json({ ok: true, message: "Sua solicitação já está aguardando análise." });
  if (error) return json({ error: "Não foi possível registrar sua solicitação." }, 500);
  return json({ ok: true, message: "Solicitação enviada. Um administrador poderá liberar seu acesso." });
});
