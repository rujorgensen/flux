# ******************************************************************************
# *** BASE STAGE
# ******************************************************************************
# use the official Bun image, see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.2.15-alpine AS base

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

RUN bun run apps/backend/portal/build.js --projectRoot=apps/backend/portal

# ******************************************************************************
# *** DEPLOY STAGE
# ******************************************************************************
# Copy production dependencies and source code into final image
FROM base AS deploy

COPY package.json ./
COPY --from=build ./src/dist ./dist

# Run the app as bun_user
RUN addgroup -S app_group && adduser -S bun_user -G app_group
USER bun_user
EXPOSE 3000/tcp

ENTRYPOINT [ "bun" ,"deploy:portal"]