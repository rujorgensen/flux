ARG FLUX_DATABASE_URL

# ******************************************************************************
# *** BASE STAGE
# ******************************************************************************
# use the official Bun image, see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.3.14-alpine AS base

WORKDIR /src

# ******************************************************************************
# *** INSTALL STAGE
# ******************************************************************************
FROM base AS install

ARG FLUX_DATABASE_URL

ENV FLUX_DATABASE_URL=$FLUX_DATABASE_URL

COPY bunfig.toml package.json bun.lock ./
COPY prisma ./prisma/

# Copy over all the package.json files--we need this until --ignore-missing-workspaces is supported (https://github.com/oven-sh/bun/issues/10930)
COPY apps/backend/mesh/package.json ./apps/backend/mesh/
COPY apps/backend/portal/package.json ./apps/backend/portal/
COPY apps/demo/package.json ./apps/demo/
COPY apps/frontend/portal/package.json ./apps/frontend/portal/
COPY packages/flux/agent/package.json ./packages/flux/agent/
COPY packages/flux/authority/package.json ./packages/flux/authority/
COPY packages/flux/mesh/package.json ./packages/flux/mesh/

#   --frozen-lockfile: don't update bun.lock
#   --ignore-scripts: don't run the postinstall script, you need to manually run the Prisma generate step
#   --filter: only install dependencies for relevant workspace
RUN bun install --frozen-lockfile --ignore-scripts --filter='@flux/portal-api' --filter='@flux/portal-ui' --filter='./'

# Generate Prisma types

# Fake database URL to persuade Prisma into generating types
ENV FLUX_DATABASE_URL=postgres://user:pw@localhost:1234/db?schema=none

#   --generator: only run the 'client' generator to avoid generating dbml output
RUN bunx --bun prisma generate --config=./prisma/prisma.config.ts --generator=client

# ******************************************************************************
# *** BUILD STAGE
# ******************************************************************************
# Copy node_modules from temp directory then copy all (non-ignored) project files into the image
FROM base AS build

COPY --from=install ./src/node_modules node_modules

# Include Prisma generated types
COPY --from=install ./src/@prisma-types/flux  ./@prisma-types/flux

COPY . .

# Build the API
RUN bun run apps/backend/portal/build.js --projectRoot=apps/backend/portal

# Build the UI
RUN bunx nx run @flux/portal-ui:build:production --verbose --skip-nx-cache

# ******************************************************************************
# *** DEPLOY STAGE
# ******************************************************************************
# Copy production dependencies and source code into final image
FROM base AS deploy

COPY package.json ./
COPY prisma ./prisma/
COPY --from=build ./src/dist ./dist
COPY --from=install ./src/@prisma-types/flux  ./@prisma-types/flux

# Run the app as bun_user
RUN addgroup -S app_group && adduser -S bun_user -G app_group
USER bun_user
EXPOSE 3000/tcp

ENTRYPOINT [ "bun" ,"deploy:portal"]