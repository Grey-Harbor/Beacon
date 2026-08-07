#!/usr/bin/env sh

generate_beacon_secret() {
  node --input-type=module -e "import { randomBytes } from 'node:crypto'; process.stdout.write(randomBytes(32).toString('base64url'));"
}

BEACON_SESSION_SECRET="$(generate_beacon_secret)" || return 1 2>/dev/null || exit 1
BEACON_SETUP_TOKEN="$(generate_beacon_secret)" || return 1 2>/dev/null || exit 1
BEACON_SOURCE_TOKEN="$(generate_beacon_secret)" || return 1 2>/dev/null || exit 1
BEACON_EVENT_TOKEN="$(generate_beacon_secret)" || return 1 2>/dev/null || exit 1

export BEACON_SESSION_SECRET
export BEACON_SETUP_TOKEN
export BEACON_SOURCE_TOKEN
export BEACON_EVENT_TOKEN

printf '%s\n' "BEACON_SESSION_SECRET=$BEACON_SESSION_SECRET"
printf '%s\n' "BEACON_SETUP_TOKEN=$BEACON_SETUP_TOKEN"
printf '%s\n' "BEACON_SOURCE_TOKEN=$BEACON_SOURCE_TOKEN"
printf '%s\n' "BEACON_EVENT_TOKEN=$BEACON_EVENT_TOKEN"
