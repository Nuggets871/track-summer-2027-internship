#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

DEPLOY_BRANCH="${DEPLOY_BRANCH:-refactor/simplify-product}"

git fetch origin "$DEPLOY_BRANCH"
remote_revision="$(git rev-parse FETCH_HEAD)"
deployed_revision="$(cat .deployed-revision 2>/dev/null || true)"

if [ "$remote_revision" = "$deployed_revision" ] && [ "${FORCE_DEPLOY:-0}" != "1" ]; then
  echo "Already deployed: $remote_revision"
  exit 0
fi

git merge --ff-only "$remote_revision"
docker compose up -d --build --wait --wait-timeout 240 app
printf '%s\n' "$remote_revision" > .deployed-revision

echo "Deployment successful: $remote_revision"
