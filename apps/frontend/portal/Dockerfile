# ******************************************************************************
# *** BASE STAGE
# ******************************************************************************
# use the official Bun image, see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.2.16-alpine AS base

WORKDIR /src

# ******************************************************************************
# *** INSTALL STAGE
# ******************************************************************************
FROM base AS install

COPY package.json bun.lock ./
COPY prisma ./prisma/

RUN bun install --frozen-lockfile

# ******************************************************************************
# *** BUILD STAGE
# ******************************************************************************
# Copy node_modules from temp directory then copy all (non-ignored) project files into the image
FROM base AS build

COPY --from=install ./src/node_modules node_modules
COPY . .

# ENV NODE_ENV=production
WORKDIR /src/apps/frontend/portal
RUN bunx --bun astro build

# ******************************************************************************
# *** DEPLOY STAGE
# ******************************************************************************
# Copy production dependencies and source code into final image
FROM base AS deploy

# Host is necessary for Docker to bind correctly
ENV HOST=0.0.0.0
ENV PORT=3001

# Can be used for debugging: RUN apk add --no-cache curl

# "COPY --from=install ./src/node_modules node_modules"
# Fixes error: Cannot find module 'kleur/colors' from '/src/dist/apps/frontend/portal/server/manifest_DmhAtobi.mjs'
# Bun v1.2.16 (Linux x64 baseline)
COPY --from=install ./src/node_modules node_modules

COPY --from=build ./src/dist ./dist
COPY --from=install ./src/node_modules/@prisma-types  ./node_modules/@prisma-types

# Run the app as bun_user
RUN addgroup -S app_group && adduser -S bun_user -G app_group
USER bun_user
EXPOSE 3001

ENTRYPOINT [ "bun", "run", "./dist/apps/frontend/portal/server/entry.mjs"]
