#!/usr/bin/env bash
# Builds the demo images into the local Docker daemon. Usage: build-images.sh <socialLight-repo-root>
set -euo pipefail
ROOT="$(cd "${1:?usage: build-images.sh <repo-root>}" && pwd)"
HERE="$(cd "$(dirname "$0")" && pwd)"
pub() { echo "=== $1"; dotnet publish "$ROOT/$2" -c Release -t:PublishContainer \
  -p:ContainerRepository="sociallight/$1" -p:ContainerImageTags=demo --nologo -v q; }
pub identity-api    src/Identity.API/Identity.API.csproj
pub profile-api     src/Profile.API/Profile.API.csproj
pub posts-api       src/Modules/Posts/Posts.API/Posts.API.csproj
pub engagement-api  src/Modules/Engagement/Engagement.API/Engagement.API.csproj
pub socialgraph-api src/Modules/SocialGraph/SocialGraph.API/SocialGraph.API.csproj
pub feed-api        src/Feed.API/Feed.API.csproj
pub media-service   src/MPEG.Service/MPEG.Service.csproj
pub groups-api        src/Modules/Groups/Groups.API/Groups.API.csproj
pub events-api        src/Modules/Events/Events.API/Events.API.csproj
pub stories-api       src/Modules/Stories/Stories.API/Stories.API.csproj
pub reels-api         src/Modules/Reels/Reels.API/Reels.API.csproj
pub notifications-api src/Modules/Notifications/Notifications.API/Notifications.API.csproj
pub chat-api          src/Modules/Chat/Chat.API/Chat.API.csproj
pub catalog-api       src/Catalog.API/Catalog.API.csproj
echo "=== web"; docker build -f "$HERE/Dockerfile.frontend" -t sociallight/web:demo "$ROOT"
