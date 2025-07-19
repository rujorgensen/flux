# ******************************************************************************
# *** BASE STAGE
# ******************************************************************************
# use the official Bun image, see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.2.19-alpine AS base

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