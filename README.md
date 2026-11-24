# ÁLIBI

Jogo brasileiro de investigação: casos fictícios, documentos para virar, ampliar, ouvir e comparar, e uma acusação que precisa se sustentar.
Next.js + TypeScript · Supabase (opcional) · Stripe (opcional) · um provedor de IA (opcional).

## Rodar localmente (sem nenhuma chave)

```bash
npm install
npm run dev
```

Abra http://localhost:3000 → **Abrir um caso**. O caso de demonstração (Nº 0417) funciona nas quatro dificuldades sem cadastro.

Verificações:

```bash
npm test          # valida o caso demo nas 4 dificuldades e a lógica de julgamento
npm run lint      # checagem de tipos
npm run build
npx next start -p 3100 & node scripts/e2e.mjs   # jornada completa em navegador (Playwright)
```

### Testar a geração de casos sem gastar IA

Em `.env.local`: `ALIBI_DEV_UNLOCK=true` e `AI_PROVIDER=mock`. Com uma chave real, troque para `AI_PROVIDER=anthropic` (ou `openai`) e preencha `AI_API_KEY`/`AI_MODEL`.
Cada caso = 1 chamada; se a validação falhar, no máximo `AI_MAX_RETRIES` novas tentativas.

## Configurar contas e cobrança

1. **Supabase**: crie um projeto, rode `supabase/migrations/0001_init.sql` no SQL Editor. Em *Authentication → URL Configuration*, defina o Site URL e adicione `<seu-site>/assinar` em Redirect URLs. Copie URL, anon key e service role key para `.env.local`.
2. **Stripe** (modo teste): copie a secret key para `STRIPE_SECRET_KEY`. Preço vem de `SUBSCRIPTION_PRICE_CENTS` (padrão 2990 = R$ 29,90) ou de `STRIPE_PRICE_ID`. Ative o Customer Portal em *Settings → Billing → Customer portal*.
3. Webhook local:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copie o `whsec_...` exibido para `STRIPE_WEBHOOK_SECRET`. Em `/assinar`, entre por e-mail, assine com o cartão `4242 4242 4242 4242` e volte à home: “Gerar caso novo” fica liberado e mostra o uso do limite (`GENERATION_LIMIT_PER_MONTH`).

## Publicar (Vercel)

1. Suba o repositório para o GitHub e importe na Vercel.
2. Cadastre as variáveis do `.env.example` (com `NEXT_PUBLIC_SITE_URL=https://seu-dominio`, `ALIBI_DEV_UNLOCK=false`).
3. No Stripe (modo produção), crie o endpoint `https://seu-dominio/api/stripe/webhook` com os eventos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`; use o segredo dele em `STRIPE_WEBHOOK_SECRET`.
4. Atualize o Site URL/Redirect URLs no Supabase para o domínio final.

A geração pode levar 1–2 min: a rota `/api/generate` declara `maxDuration = 300` (exige plano da Vercel que permita esse tempo).

## Estrutura

- `src/lib/demo-case.ts` — caso de demonstração escrito à mão (verdade + versões Fácil/Médio/Difícil/Extreme).
- `src/lib/case-logic.ts` — visão pública (sem gabarito), validação de casos e julgamento.
- `src/lib/ai.ts` — geração estruturada, validação de esquema e novas tentativas limitadas.
- `src/app/api/*` — casos, verificações, geração, conta, Stripe.
- `src/components/*` — abertura, documentos, visualizador, modos de jogo, acusação, desfecho.

Soluções, gabaritos e chaves ficam só no servidor. O progresso do jogador (etapa, prazo, mesa, notas) fica no navegador.
