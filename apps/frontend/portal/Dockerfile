# ******************************************************************************
# *** BASE STAGE
# ******************************************************************************
# use the official Bun image, see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.3.3-alpine AS base

WORKDIR /src

# ******************************************************************************
# *** INSTALL STAGE
# ******************************************************************************
FROM base AS install

COPY bunfig.toml package.json bun.lock ./

# Copy over all the package.json files--we need this until --ignore-missing-workspaces is supported (https://github.com/oven-sh/bun/issues/10930)
COPY apps/backend/mesh/package.json ./apps/backend/mesh/
COPY apps/backend/portal/package.json ./apps/backend/portal/
COPY apps/demo/package.json ./apps/demo/
COPY apps/frontend/portal/package.json ./apps/frontend/portal/
COPY packages/flux/agent/package.json ./packages/flux/agent/
COPY packages/flux/authority/package.json ./packages/flux/authority/
COPY packages/flux/mesh/package.json ./packages/flux/mesh/

# Don't run postinstall--you need to manually run the Prisma generate step
#   --frozen-lockfile: don't update bun.lock
#   --ignore-scripts: dont run the postinstall script
#   --filter: only install seleceted workspace packages (skip others to save space/time)
RUN bun install --frozen-lockfile --ignore-scripts --filter='@flux/portal-ui'

# ******************************************************************************
# *** BUILD STAGE
# ******************************************************************************
# Copy node_modules from temp directory then copy all (non-ignored) project files into the image
FROM base AS build

COPY --from=install ./src/node_modules node_modules
COPY . .

# ENV NODE_ENV=production
WORKDIR /src/apps/frontend/portal
RUN bunx astro build

# ******************************************************************************
# *** DEPLOY STAGE
# ******************************************************************************
# Copy production dependencies and source code into final image
FROM base AS deploy

# Host is necessary for Docker to bind correctly
ENV HOST=0.0.0.0
ENV PORT=3001

COPY --from=install ./src/node_modules node_modules
COPY --from=build ./src/dist ./dist

# Run the app as bun_user
RUN addgroup -S app_group && adduser -S bun_user -G app_group
USER bun_user
EXPOSE 3001

ENTRYPOINT [ "bun", "run", "./dist/apps/frontend/portal/server/entry.mjs"]
