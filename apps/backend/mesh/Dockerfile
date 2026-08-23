# ******************************************************************************
# *** BASE STAGE
# ******************************************************************************
# use the official Bun image, see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.4.0-alpine AS base

WORKDIR /src

# ******************************************************************************
# *** INSTALL STAGE
# ******************************************************************************
FROM base AS install

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
RUN bun install --frozen-lockfile --ignore-scripts --filter='@flux/mesh'

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

# ENV NODE_ENV=production
RUN bun run apps/backend/mesh/build.js --projectRoot=apps/backend/mesh

# ******************************************************************************
# *** DEPLOY STAGE
# ******************************************************************************
# Copy production dependencies and source code into final image
FROM base AS deploy

COPY --from=build ./src/dist ./dist

# Run the app as bun_user
RUN addgroup -S app_group && adduser -S bun_user -G app_group
USER bun_user
EXPOSE 5100/tcp

ENTRYPOINT [ "bun", "run", "./dist/apps/backend/mesh/main.js" ]
