#!/usr/bin/env bash
# Publica o ÁLIBI no Google Cloud Run (rode no Cloud Shell: https://shell.cloud.google.com).
# Uso: bash <(curl -fsSL https://raw.githubusercontent.com/rafaelghida-arch/alibi/main/deploy/cloudrun.sh) [ID_DO_PROJETO]
set -euo pipefail
PROJECT="${1:-${GOOGLE_CLOUD_PROJECT:-}}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-alibi}"
REPO="https://github.com/rafaelghida-arch/alibi"
[ -n "$PROJECT" ] || { read -rp "ID do projeto no Google Cloud: " PROJECT; }

echo "▶ Projeto: $PROJECT · Região: $REGION"
gcloud config set project "$PROJECT" >/dev/null

echo "▶ Ativando os serviços necessários (pode levar 1 minuto)…"
if ! gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --quiet; then
  echo "✗ Não foi possível ativar os serviços. Confira se o projeto tem uma conta de faturamento vinculada:"
  echo "  https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT"
  exit 1
fi

PN=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:${PN}-compute@developer.gserviceaccount.com" \
  --role=roles/run.builder --condition=None --quiet >/dev/null 2>&1 || true

echo
echo "▶ Cole as chaves secretas (elas não aparecem na tela). Enter para deixar em branco."
read -rsp "  SUPABASE_SERVICE_ROLE_KEY: " SUPA; echo
read -rsp "  STRIPE_SECRET_KEY: " STRIPE; echo
read -rsp "  AI_API_KEY (OpenAI): " AIKEY; echo

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
git clone -q --depth 1 "$REPO" "$WORK/alibi"
umask 077
ENVFILE="$WORK/env.yaml"
q() { printf '"%s"' "$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g')"; }
{
  echo "SUPABASE_SERVICE_ROLE_KEY: $(q "$SUPA")"
  echo "STRIPE_SECRET_KEY: $(q "$STRIPE")"
  echo "AI_API_KEY: $(q "$AIKEY")"
  echo 'AI_PROVIDER: "openai"'
  echo 'AI_MODEL: "gpt-4.1"'
  echo 'AI_MAX_RETRIES: "1"'
  echo 'STRIPE_PRODUCT_ID: "prod_Vgict4F6ZdRZBW"'
  echo 'SUBSCRIPTION_PRICE_CENTS: "2990"'
  echo 'GENERATION_LIMIT_PER_MONTH: "30"'
  echo 'IMAGE_MAX_PER_CASE: "0"'
} > "$ENVFILE"

echo "▶ Montando e publicando (o primeiro build leva ~5 minutos)…"
gcloud run deploy "$SERVICE" --source "$WORK/alibi" --region "$REGION" --quiet \
  --allow-unauthenticated --port 8080 --memory 512Mi --cpu 1 --timeout 300 \
  --min-instances 0 --max-instances 2 --env-vars-file "$ENVFILE"

URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')
echo
echo "✅ ÁLIBI publicado em: $URL"
echo "   Mande este endereço para o Claude terminar a configuração do login."
