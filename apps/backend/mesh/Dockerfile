# ******************************************************************************
# *** BASE STAGE
# ******************************************************************************
# use the official Bun image, see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.2.14-alpine AS base

WORKDIR /src

# ******************************************************************************
# *** INSTALL STAGE
# ******************************************************************************
FROM base AS install

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

# ******************************************************************************
# *** BUILD STAGE
# ******************************************************************************
# Copy node_modules from temp directory then copy all (non-ignored) project files into the image
FROM base AS build

COPY --from=install ./src/node_modules node_modules
COPY . .

# Disable Nx daemon to avoid project graph failures in Docker
ENV NX_DAEMON=false

# ENV NODE_ENV=production
RUN bunx nx run backend-mesh:build

# ******************************************************************************
# *** DEPLOY STAGE
# ******************************************************************************
# Copy production dependencies and source code into final image
FROM base AS deploy

COPY --from=install ./src/node_modules node_modules
COPY --from=build ./src/dist ./dist

# Run the app as bun_user
USER bun_user
EXPOSE 8080/tcp

ENTRYPOINT [ "bun", "run", "./dist/packages/flux/mesh/main.js" ]