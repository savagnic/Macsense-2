#!/usr/bin/env bash
set -euo pipefail

RG="overmind23"
APP="overmind-bridge"
POOL="overmindsandbox"
SHA="54c68c5ef71d8d4530c7f700a05dabb956493d86"
REPO="savagnic/overmind-os"

log(){ printf '\n==> %s\n' "$*"; }
fail(){ printf '\nERROR: %s\n' "$*" >&2; exit 1; }

log "Locating the Azure subscription that contains ${RG}"
FOUND=""
while IFS=$'\t' read -r SUB_ID SUB_NAME; do
  [ -n "${SUB_ID:-}" ] || continue
  az account set --subscription "$SUB_ID" >/dev/null 2>&1 || continue
  if az group show --name "$RG" >/dev/null 2>&1; then
    FOUND="$SUB_ID"
    printf 'Using subscription: %s\n' "$SUB_NAME"
    break
  fi
done < <(az account list --query "[?state=='Enabled'].[id,name]" -o tsv)
[ -n "$FOUND" ] || fail "Resource group ${RG} was not found in any enabled subscription"

log "Ensuring Azure Container Apps CLI support is available"
az config set extension.dynamic_install_allow_preview=true >/dev/null 2>&1 || true
az extension add --name containerapp --upgrade --yes >/dev/null 2>&1 || true

log "Resolving live Overmind and registry state"
REV="$(az containerapp show -n "$APP" -g "$RG" --query properties.latestReadyRevisionName -o tsv)"
[ -n "$REV" ] || fail "No ready production revision found"
CURRENT_IMAGE="$(az containerapp show -n "$APP" -g "$RG" --query 'properties.template.containers[0].image' -o tsv)"
[ -n "$CURRENT_IMAGE" ] || fail "No current Overmind image found"
ACR_SERVER="${CURRENT_IMAGE%%/*}"
ACR="${ACR_SERVER%%.azurecr.io}"
az acr show -n "$ACR" -g "$RG" >/dev/null || fail "Unable to access ACR ${ACR}"
printf 'Production revision: %s\nACR: %s\n' "$REV" "$ACR"

log "Verifying governed GitHub credential mount without reading its value"
CHECK_OUT="$(mktemp)"
az containerapp exec -n "$APP" -g "$RG" --revision "$REV" --command "sh -lc 'test -s /mnt/overmind-secrets/github-token && echo MOUNT_OK'" >"$CHECK_OUT" 2>&1 || { cat "$CHECK_OUT"; fail "Unable to inspect governed credential mount"; }
grep -q 'MOUNT_OK' "$CHECK_OUT" || { cat "$CHECK_OUT"; fail "Governed GitHub credential file is not mounted"; }
rm -f "$CHECK_OUT"

log "Exporting exact trusted Overmind main from inside the production container"
RAW="$(mktemp)"
ARCHIVE="$(mktemp --suffix=.tgz)"
SRC="$(mktemp -d)"
cleanup(){ rm -f "$RAW" "$ARCHIVE"; rm -rf "$SRC"; }
trap cleanup EXIT

REMOTE_CMD="sh -lc '
set -eu
rm -rf /tmp/overmind-release-src
mkdir -p /tmp/overmind-release-src
cd /tmp/overmind-release-src
git init -q
git remote add origin https://github.com/${REPO}.git
TOKEN=\$(cat /mnt/overmind-secrets/github-token)
AUTH=\$(printf "x-access-token:%s" "\$TOKEN" | base64 | tr -d "\\r\\n")
git -c "http.https://github.com/.extraheader=AUTHORIZATION: basic \$AUTH" fetch -q --depth 1 origin ${SHA}
git checkout -q --detach FETCH_HEAD
test "\$(git rev-parse HEAD)" = "${SHA}"
echo __OVERMIND_SOURCE_BEGIN__
tar --exclude=.git -czf - . | base64
echo __OVERMIND_SOURCE_END__
'"

az containerapp exec -n "$APP" -g "$RG" --revision "$REV" --command "$REMOTE_CMD" >"$RAW" 2>&1 || { sed -n '1,120p' "$RAW"; fail "Private source export failed"; }

awk '/__OVERMIND_SOURCE_BEGIN__/{f=1;next}/__OVERMIND_SOURCE_END__/{f=0}f' "$RAW" \
  | tr -cd 'A-Za-z0-9+/=\r\n' \
  | tr -d '\r\n' \
  | base64 -d >"$ARCHIVE" || fail "Source archive decode failed"
[ -s "$ARCHIVE" ] || fail "Source archive was empty"
tar -xzf "$ARCHIVE" -C "$SRC" || fail "Source archive extraction failed"

[ -f "$SRC/Dockerfile" ] || fail "Dockerfile missing from trusted source"
[ -f "$SRC/Dockerfile.sessions" ] || fail "Dockerfile.sessions missing from trusted source"
[ -f "$SRC/scripts/prove-level3-production.mjs" ] || fail "Level 3 production proof script missing"
[ -f "$SRC/src/session-runner/server.mjs" ] || fail "Session runner source missing"
grep -F -- "--test-reporter=tap" "$SRC/scripts/prove-level3-production.mjs" >/dev/null || fail "Trusted source lacks deterministic TAP reporter fix"
grep -F "readdir(ROOT)" "$SRC/src/session-runner/server.mjs" >/dev/null || fail "Trusted source lacks mounted-workspace preservation fix"
printf 'Trusted source verified: %s\n' "$SHA"

log "Building corrected Dynamic Sessions runner in Azure Container Registry"
az acr build -r "$ACR" -t "overmind-session-runner:${SHA}" -f "$SRC/Dockerfile.sessions" "$SRC"
RUNNER_DIGEST="$(az acr repository show -n "$ACR" --image "overmind-session-runner:${SHA}" --query digest -o tsv)"
[[ "$RUNNER_DIGEST" =~ ^sha256:[a-fA-F0-9]{64}$ ]] || fail "Unable to resolve runner digest"
RUNNER_IMAGE="${ACR_SERVER}/overmind-session-runner@${RUNNER_DIGEST}"
printf 'Runner digest: %s\n' "$RUNNER_DIGEST"

log "Updating Dynamic Sessions pool to the digest-pinned corrected runner"
az containerapp sessionpool update -n "$POOL" -g "$RG" \
  --image "$RUNNER_IMAGE" \
  --env-vars NODE_ENV=production PORT=8080 OVERMIND_SESSION_WORKSPACE=/tmp/overmind-workspace \
  -o none

for _ in $(seq 1 90); do
  STATE="$(az containerapp sessionpool show -n "$POOL" -g "$RG" --query properties.provisioningState -o tsv 2>/dev/null || true)"
  [ "$STATE" = "Succeeded" ] && break
  sleep 5
done
[ "${STATE:-}" = "Succeeded" ] || fail "Session pool did not reach Succeeded"
DEPLOYED_RUNNER="$(az containerapp sessionpool show -n "$POOL" -g "$RG" --query 'properties.customContainerTemplate.containers[0].image' -o tsv)"
[ "$DEPLOYED_RUNNER" = "$RUNNER_IMAGE" ] || fail "Session pool did not bind the expected digest-pinned runner"
NETWORK_STATUS="$(az containerapp sessionpool show -n "$POOL" -g "$RG" --query properties.sessionNetworkConfiguration.status -o tsv)"
[ "$NETWORK_STATUS" = "EgressDisabled" ] || fail "Session pool network isolation is no longer EgressDisabled"

POOL_ID="$(az resource show --resource-group "$RG" --name "$POOL" --resource-type Microsoft.App/sessionPools --api-version 2026-01-01 --query id -o tsv)"
APP_PRINCIPAL="$(az containerapp identity show -n "$APP" -g "$RG" --query principalId -o tsv)"
[ -n "$POOL_ID" ] && [ -n "$APP_PRINCIPAL" ] || fail "Unable to resolve Level 3 RBAC identities"
EXECUTOR_COUNT="$(az role assignment list --assignee-object-id "$APP_PRINCIPAL" --scope "$POOL_ID" --query "[?roleDefinitionName=='Azure ContainerApps Session Executor'] | length(@)" -o tsv 2>/dev/null || echo 0)"
[ "$EXECUTOR_COUNT" != "0" ] || fail "Azure ContainerApps Session Executor role is missing at the Level 3 pool scope"

log "Building exact trusted-main Overmind production image in ACR"
az acr build -r "$ACR" -t "overmind-os:${SHA}" -f "$SRC/Dockerfile" "$SRC"
APP_DIGEST="$(az acr repository show -n "$ACR" --image "overmind-os:${SHA}" --query digest -o tsv)"
[[ "$APP_DIGEST" =~ ^sha256:[a-fA-F0-9]{64}$ ]] || fail "Unable to resolve Overmind image digest"
printf 'Overmind image digest: %s\n' "$APP_DIGEST"

log "Deploying trusted main while preserving current Container App configuration"
OLD_REV="$REV"
az containerapp update -n "$APP" -g "$RG" \
  --image "${ACR_SERVER}/overmind-os:${SHA}" \
  --set-env-vars OVERMIND_LEVEL3_PRODUCTION_SOURCE_SHA="$SHA" \
  -o none

NEW_REV=""
for _ in $(seq 1 90); do
  NEW_REV="$(az containerapp show -n "$APP" -g "$RG" --query properties.latestReadyRevisionName -o tsv 2>/dev/null || true)"
  if [ -n "$NEW_REV" ] && [ "$NEW_REV" != "$OLD_REV" ]; then break; fi
  sleep 5
done
[ -n "$NEW_REV" ] && [ "$NEW_REV" != "$OLD_REV" ] || fail "A new ready Overmind revision did not appear"
printf 'New production revision: %s\n' "$NEW_REV"

FQDN="$(az containerapp show -n "$APP" -g "$RG" --query properties.configuration.ingress.fqdn -o tsv)"
if [ -n "$FQDN" ]; then
  for _ in $(seq 1 30); do
    if curl -fsS "https://${FQDN}/readyz" >/dev/null 2>&1; then
      printf 'Production readiness endpoint: PASS\n'
      break
    fi
    sleep 4
  done
fi

log "Running authoritative Level 3 production proof"
PROOF_OUT="$(mktemp)"
set +e
az containerapp exec -n "$APP" -g "$RG" --revision "$NEW_REV" --command "node /app/scripts/prove-level3-production.mjs" | tee "$PROOF_OUT"
PROOF_RC=${PIPESTATUS[0]}
set -e
if [ "$PROOF_RC" -ne 0 ]; then
  fail "Level 3 production proof command failed"
fi
if ! grep -Eq '"status"[[:space:]]*:[[:space:]]*"CLOSED"' "$PROOF_OUT"; then
  fail "Level 3 proof did not emit status=CLOSED"
fi

printf '\nLEVEL3_CLOSED=true\n'
printf 'SOURCE_SHA=%s\n' "$SHA"
printf 'PRODUCTION_REVISION=%s\n' "$NEW_REV"
printf 'APP_IMAGE_DIGEST=%s\n' "$APP_DIGEST"
printf 'SESSION_RUNNER_DIGEST=%s\n' "$RUNNER_DIGEST"
printf 'SESSION_NETWORK=%s\n' "$NETWORK_STATUS"
printf '\nOvermind Level 3 production closure succeeded.\n'
