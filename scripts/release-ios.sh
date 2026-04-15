#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE_PATH="${IOS_RELEASE_ENV_FILE:-$ROOT_DIR/.env.release}"

if [[ -f "$ENV_FILE_PATH" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE_PATH"
  set +a
fi

WORKSPACE_PATH="${IOS_WORKSPACE_PATH:-$ROOT_DIR/ios/CheckCalo.xcworkspace}"
SCHEME_NAME="${IOS_SCHEME_NAME:-CheckCalo}"
ARCHIVE_PATH="${IOS_ARCHIVE_PATH:-$ROOT_DIR/build/CheckCalo.xcarchive}"
EXPORT_PATH="${IOS_EXPORT_PATH:-$ROOT_DIR/build/export}"
EXPORT_OPTIONS_PLIST="${IOS_EXPORT_OPTIONS_PLIST:-$ROOT_DIR/ios/ExportOptions.AppStore.plist}"
IPA_PATH="${IOS_IPA_PATH:-$EXPORT_PATH/CheckCalo.ipa}"
API_KEY="${APP_STORE_CONNECT_API_KEY:-}"
API_ISSUER="${APP_STORE_CONNECT_ISSUER_ID:-}"

log_step() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "Missing required file: $1" >&2
    exit 1
  fi
}

require_command npx
require_command xcodebuild
require_command xcrun
require_file "$EXPORT_OPTIONS_PLIST"

if [[ -z "$API_KEY" || -z "$API_ISSUER" ]]; then
  echo "APP_STORE_CONNECT_API_KEY and APP_STORE_CONNECT_ISSUER_ID must be set." >&2
  exit 1
fi

mkdir -p "$ROOT_DIR/build" "$EXPORT_PATH"

log_step "1. Prebuild iOS"
(cd "$ROOT_DIR" && npx expo prebuild -p ios)

log_step "2. Archive app"
xcodebuild \
  -workspace "$WORKSPACE_PATH" \
  -scheme "$SCHEME_NAME" \
  -configuration Release \
  -destination generic/platform=iOS \
  -archivePath "$ARCHIVE_PATH" \
  archive

log_step "3. Export IPA for App Store"
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS_PLIST"

require_file "$IPA_PATH"

log_step "4. Upload to App Store Connect"
xcrun iTMSTransporter \
  -m upload \
  -assetFile "$IPA_PATH" \
  -apiKey "$API_KEY" \
  -apiIssuer "$API_ISSUER"

log_step "Done"
