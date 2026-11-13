# Adega

MVP funcional para controle institucional de vinhos. O estoque é derivado do razão de movimentações (`stock_ledger`): entradas e saídas confirmadas são processadas por RPCs transacionais no Supabase, preservando a rastreabilidade.

## Configuração

1. Ative um projeto Supabase e aplique `supabase/migrations/202611130001_initial_schema.sql` pelo SQL Editor ou CLI.
2. Crie um usuário no painel Authentication e altere seu papel para `admin` em `profiles`.
3. Copie `.env.example` para `.env.local` e informe somente a URL e a chave pública anon.
4. Execute `npm install` e `npm run dev`.

Nunca exponha a chave `service_role` no navegador.
