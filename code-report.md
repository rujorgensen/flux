## Fallow: 174 issues found

### Unused files (39)

- `apps/backend/mesh/build.js`
- `apps/backend/portal/build.js`
- `apps/backend/portal/src/repository/user.repository.ts`
- `apps/backend/portal/src/utils/proxy.fn.ts`
- `apps/demo/src/auth-settings.ts`
- `apps/demo/src/client-a/main-a.ts`
- `apps/demo/src/client-a/main-activity.ts`
- `apps/demo/src/client-a/main-authority.ts`
- `apps/demo/src/client-a/main-b.ts`
- `apps/demo/src/client-a/main-settings.ts`
- `apps/demo/src/client-a/styles.css`
- `apps/demo/src/client-a/web-rtc.ts`
- `apps/demo/src/definitions.ts`
- `apps/demo/src/flux-url.ts`
- `apps/demo/src/http.server.ts`
- `apps/demo/src/network-id.ts`
- `apps/demo/src/server-a/main.ts`
- `apps/frontend/portal/src/app/data/flux/channels.service.fn.ts`
- `packages/flux/agent/src/lib/connector/rpc/NOT-USED-network-authority.class.ts`
- `packages/flux/agent/src/lib/connector/state-machines/connect-to-remote-client.ts`
- `packages/flux/agent/src/lib/flux-interface.class.ts`
- `packages/flux/agent/src/lib/route-transport-coordinator.ts`
- `packages/flux/agent/src/lib/utils/obscuring/decrypt.utils.ts`
- `packages/flux/authority/src/lib/connector/rpc/NOT-USED-network-authority.class.ts`
- `packages/flux/authority/src/lib/connector/state-machines/connect-to-remote-client.ts`
- `packages/flux/authority/src/lib/flux-interface.class.ts`
- `packages/flux/authority/src/lib/flux-remote-client.class.ts`
- `packages/flux/authority/src/lib/low-level-com/web-rtc/ice-connection.ts`
- `packages/flux/authority/src/lib/route-transport-coordinator.ts`
- `packages/flux/authority/src/lib/utils/obscuring/decrypt.utils.ts`
- `packages/flux/authority/src/lib/utils/obscuring/encyprt.utils.ts`
- `packages/flux/authority/src/lib/utils/obscuring/shared.utils.ts`
- `packages/flux/mesh/build.js`
- `packages/flux/mesh/src/_managers/authority.manager.ts`
- `packages/flux/mesh/src/_managers/local/local-authority.manager.ts`
- `packages/flux/mesh/src/routing/incomming-message-router.class.ts`
- `packages/flux/mesh/src/routing/redis/network-agent.redis.ts`
- `prisma/flux/seed.ts`
- `prisma/prisma.config.ts`

### Unused exports (20)

- `apps/backend/portal/src/api/networks/networks.controller.ts`
  - :13 `apiRoutes`
- `apps/demo/src/auth-settings.ts`
  - :3 `DEFAULT_AUTHORITY_PASSWORD`
  - :4 `DEFAULT_NETWORK_ACCESS_TOKEN`
  - :6 `DEFAULT_AUTHORITY_OBJECT`
  - :18 `getAuthorityKey`
  - :21 `setAuthorityKey`
  - :27 `getAuthorityObject`
  - :42 `setAuthorityObject`
- `apps/demo/src/definitions.ts`
  - :1 `DEMO_CHANNEL_PASSWORD`
- `apps/demo/src/flux-url.ts`
  - :1 `DEFAULT_FLUX_URL`
  - :5 `getFluxUrl`
  - :9 `setFluxUrl`
- `apps/demo/src/network-id.ts`
  - :3 `DEFAULT_NETWORK_ID`
  - :7 `getNetworkId`
  - :10 `setNetworkId`
- `libs/backend/features/network/src/index.ts`
  - :6 `NetworkTokenService` (re-export)
- `libs/flux/shared/types/src/lib/client-id.type.ts`
  - :5 `NANOID_ALPHABET`
- `packages/flux/authority/src/lib/low-level-com/web-rtc/ice-connection.ts`
  - :23 `ICEConnection`
- `packages/flux/authority/src/lib/utils/obscuring/shared.utils.ts`
  - :12 `deriveKey`
- `packages/flux/mesh/src/_managers/local/local-authority.manager.ts`
  - :9 `LocalAuthorityManager`

### Unused type exports (1)

- `packages/flux/mesh/src/auth/auth.ts`
  - :16 `TTokenPayloadJWT`

### Unused dependencies (19)

- `@elysiajs/cors` (apps/backend/mesh/package.json; imported in apps/backend/portal)
- `@elysiajs/swagger` (apps/backend/mesh/package.json; imported in apps/backend/portal)
- `@prisma/adapter-pg` (apps/backend/mesh/package.json)
- `elysia` (apps/backend/mesh/package.json; imported in apps/backend/portal)
- `jsonwebtoken` (apps/backend/mesh/package.json; imported in apps/backend/portal)
- `nanoid` (apps/backend/mesh/package.json; imported in apps/backend/portal)
- `@prisma/adapter-pg` (apps/backend/portal/package.json)
- `better-auth` (apps/backend/portal/package.json; imported in apps/frontend/portal)
- `@angular/animations` (apps/frontend/portal/package.json)
- `@angular/platform-server` (apps/frontend/portal/package.json)
- `@prisma/adapter-pg` (apps/frontend/portal/package.json)
- `daisyui` (apps/frontend/portal/package.json)
- `open-props` (apps/frontend/portal/package.json)
- `rollup-plugin-visualizer` (apps/frontend/portal/package.json)
- `tailwind-merge` (apps/frontend/portal/package.json)
- `tailwind-variants` (apps/frontend/portal/package.json)
- `tw-animate-css` (apps/frontend/portal/package.json)
- `zod` (apps/frontend/portal/package.json)
- `clsx`

### Unused devDependencies (11)

- `@tailwindcss/vite` (apps/frontend/portal/package.json)
- `@angular-devkit/core`
- `@angular-devkit/schematics`
- `@angular/language-service`
- `@nx/plugin`
- `@nx/vitest`
- `@schematics/angular`
- `@swc-node/register`
- `@swc/helpers`
- `open-cli`
- `vite-tsconfig-paths`

### Unused class members (48)

- `apps/backend/portal/src/_services/redis-status.service.ts`
  - :72 `RedisStatusService.offAlert`
- `apps/backend/portal/src/api/networks/tokens/create-network-token.fn.ts`
  - :26 `MaximumTokensReachedError.status`
- `apps/backend/portal/src/repository/network.repository.ts`
  - :37 `NetworkRepository.createNetwork`
  - :124 `NetworkRepository.readUserNetworks`
  - :221 `NetworkRepository.deleteNetwork`
- `libs/backend/features/network/src/lib/tokens/network-token.repository.ts`
  - :175 `NetworkTokenRepository.updateNetworkTokens`
- `libs/backend/features/network/src/lib/tokens/network-token.service.ts`
  - :42 `NetworkTokenService.createToken`
  - :106 `NetworkTokenService.countByNetworkId`
  - :118 `NetworkTokenService.findById`
  - :135 `NetworkTokenService.rotateOutAllExcept`
  - :159 `NetworkTokenService.deleteNetworkToken`
- `libs/core/redis/bun-wrapper/src/lib/bun-redis-client-wrapper.ts`
  - :49 `BunRedisClient.clone`
- `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.service.ts`
  - :133 `NetworkAgentRedisService.readAgentByClientId`
  - :197 `NetworkAgentRedisService.onAgentThroughput`
  - :212 `NetworkAgentRedisService.onAgentCreated`
  - :225 `NetworkAgentRedisService.onAgentDeleted`
- `libs/flux/mesh/store/redis/network-authority/src/lib/network-authority-redis.service.ts`
  - :184 `NetworkAuthorityRedisService.onAuthorityCreated`
  - :197 `NetworkAuthorityRedisService.onAuthorityDeleted`
- `libs/flux/mesh/store/redis/network-channel/src/lib/network-channel.redis.service.ts`
  - :101 `NetworkChannelService.readNetworkChannelNames`
  - :303 `NetworkChannelService.onChannelCreate`
  - :316 `NetworkChannelService.onChannelUsage`
  - :343 `NetworkChannelService.onChannelStateChange`
  - :356 `NetworkChannelService.onChannelDelete`
- `libs/flux/shared/connection/src/lib/agent/flux-agent-network.class.ts`
  - :92 `FluxAgentNetworkConnection.connectToAgent`
- `libs/flux/shared/utils/src/lib/eventemitter.ts`
  - :22 `EventEmitter.off`
- `libs/flux/shared/utils/src/lib/state-manager.util.ts`
  - :42 `StateManager.detachNetworkStateListener`
  - :60 `StateManager.detachWebRTCStateListener`
  - :79 `StateManager.detachDirectMessageListener`
- `libs/flux/shared/ws/src/lib/rpc/rpc-server.class.ts`
  - :30 `RPCServer.handleMessage`
- `packages/flux/agent/src/lib/flux-agent.class.ts`
  - :172 `FluxAgent.onWebRTConnectionState`
  - :181 `FluxAgent.onDirectPublish`
  - :186 `FluxAgent.onNetworkState`
  - :193 `FluxAgent.onMessage`
- `packages/flux/agent/src/lib/flux-remote-client.class.ts`
  - :16 `FluxRemoteClient.callProcedure`
  - :27 `FluxRemoteClient.send`
- `packages/flux/authority/src/lib/connector/flux-client-data.class.ts`
  - :23 `FluxClientData.onMessage`
- `packages/flux/authority/src/lib/flux-authority-network.class.ts`
  - :35 `FluxAuthorityNetworkConnection.disconnectAgent`
- `packages/flux/authority/src/lib/flux-authority.class.ts`
  - :140 `FluxAuthority.disconnect`
  - :149 `FluxAuthority.onNetworkState`
- `packages/flux/mesh/src/_classes/web-rtc-client-interface.class.ts`
  - :33 `WebRTCClient.createOffer`
  - :45 `WebRTCClient.acceptOfferAndCreateAnswer`
  - :59 `WebRTCClient.acceptAnswer`
  - :72 `WebRTCClient.answerWasAccepted`
  - :89 `GlobalWebRTCClient.createOffer`
  - :115 `GlobalWebRTCClient.acceptAnswer`
- `packages/flux/mesh/src/register/network-agent.service.ts`
  - :32 `NetworkAgentService.registerAgent`
  - :97 `NetworkAgentService.resolveClientAddressByUid`
- `packages/flux/mesh/src/routing/redis/redis-connection.class.ts`
  - :410 `RedisConnection.unsubscribe`

### Unresolved imports (5)

- `apps/demo/index.html`
  - :1 `/src/main.ts`
  - :1 `/src/styles.css`
- `apps/frontend/portal/src/styles.scss`
  - :1 `./tailwindcss`
  - :3 `daisyui`
  - :9 `'https:                                                                                                                          

                           
:root {
                                                                                   
                          
                                                                  
                                                                                   

                                                  
    *,
    *::before,
    *::after {
        box-sizing: border-box;
    }

                                                                                                                                     
                      
                     
        

                                      
    @media (prefers-reduced-motion: no-preference`

### Unlisted dependencies (6)

- `@prisma-types/flux`
- `@prisma/adapter-pg`
- `better-auth`
- `elysia`
- `ms`
- `nanoid`

### Circular dependencies (22)

- `libs/backend/features/network/src/index.ts` → `libs/backend/features/network/src/lib/network-token-cache.class.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/main.ts` → `packages/flux/mesh/src/_routes/auth/network-authority.post.route.ts` → `libs/backend/features/network/src/index.ts`
- `libs/backend/features/network/src/index.ts` → `libs/backend/features/network/src/lib/tokens/network-token.service.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/main.ts` → `packages/flux/mesh/src/_routes/auth/network-authority.post.route.ts` → `libs/backend/features/network/src/index.ts`
- `libs/flux/mesh/store/redis/network-agent/src/index.ts` → `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.service.ts` → `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.repository.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/_managers/global/global-client.manager.ts` → `libs/flux/mesh/store/redis/network-agent/src/index.ts`
- `libs/flux/mesh/store/redis/network-agent/src/index.ts` → `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.service.ts` → `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.repository.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/main.ts` → `packages/flux/mesh/src/register/network-agent-redis-cache.class.ts` → `libs/flux/mesh/store/redis/network-agent/src/index.ts`
- `libs/flux/mesh/store/redis/network-agent/src/index.ts` → `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.service.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/_managers/global/global-client.manager.ts` → `libs/flux/mesh/store/redis/network-agent/src/index.ts`
- `libs/flux/mesh/store/redis/network-agent/src/index.ts` → `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.service.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/main.ts` → `packages/flux/mesh/src/_managers/agent.manager.ts` → `packages/flux/mesh/src/_managers/global/global-client.manager.ts` → `libs/flux/mesh/store/redis/network-agent/src/index.ts`
- `libs/flux/mesh/store/redis/network-agent/src/index.ts` → `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.service.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/main.ts` → `packages/flux/mesh/src/register/network-agent-redis-cache.class.ts` → `libs/flux/mesh/store/redis/network-agent/src/index.ts`
- `libs/flux/mesh/store/redis/network-agent/src/index.ts` → `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.service.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/main.ts` → `packages/flux/mesh/src/register/network-agent.service.ts` → `packages/flux/mesh/src/register/network-agent-redis-cache.class.ts` → `libs/flux/mesh/store/redis/network-agent/src/index.ts`
- `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.repository.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/main.ts` → `packages/flux/mesh/src/_managers/agent.manager.ts` → `packages/flux/mesh/src/_managers/local/local-agent.manager.ts` → `packages/flux/mesh/src/register/network-agent.service.ts` → `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.repository.ts`
- `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.repository.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/main.ts` → `packages/flux/mesh/src/_managers/agent.manager.ts` → `packages/flux/mesh/src/register/network-agent.service.ts` → `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.repository.ts`
- `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.repository.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/main.ts` → `packages/flux/mesh/src/_ws-handlers/ws-socket-close.ts` → `packages/flux/mesh/src/register/network-agent.service.ts` → `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.repository.ts`
- `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.repository.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/main.ts` → `packages/flux/mesh/src/business-logic/processes/process.class.ts` → `packages/flux/mesh/src/register/network-agent.service.ts` → `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.repository.ts`
- `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.repository.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/main.ts` → `packages/flux/mesh/src/register/network-agent.service.ts` → `libs/flux/mesh/store/redis/network-agent/src/lib/network-agent-redis.repository.ts`
- `libs/flux/mesh/store/redis/network-authority/src/index.ts` → `libs/flux/mesh/store/redis/network-authority/src/lib/network-authority-redis.service.ts` → `libs/flux/mesh/store/redis/network-authority/src/lib/network-authority.redis.sorted-set.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/_managers/global/global-client.manager.ts` → `libs/flux/mesh/store/redis/network-authority/src/index.ts`
- `libs/flux/mesh/store/redis/network-authority/src/index.ts` → `libs/flux/mesh/store/redis/network-authority/src/lib/network-authority-redis.service.ts` → `libs/flux/mesh/store/redis/network-authority/src/lib/network-authority.redis.sorted-set.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/main.ts` → `packages/flux/mesh/src/register/network-authority-cache.class.ts` → `libs/flux/mesh/store/redis/network-authority/src/index.ts`
- `libs/flux/mesh/store/redis/network-authority/src/index.ts` → `libs/flux/mesh/store/redis/network-authority/src/lib/network-authority-redis.service.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/_managers/global/global-client.manager.ts` → `libs/flux/mesh/store/redis/network-authority/src/index.ts`
- `libs/flux/mesh/store/redis/network-authority/src/index.ts` → `libs/flux/mesh/store/redis/network-authority/src/lib/network-authority-redis.service.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/main.ts` → `packages/flux/mesh/src/_managers/agent.manager.ts` → `packages/flux/mesh/src/_managers/global/global-client.manager.ts` → `libs/flux/mesh/store/redis/network-authority/src/index.ts`
- `libs/flux/mesh/store/redis/network-authority/src/index.ts` → `libs/flux/mesh/store/redis/network-authority/src/lib/network-authority-redis.service.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/main.ts` → `packages/flux/mesh/src/_ws-handlers/ws-socket-close.ts` → `packages/flux/mesh/src/register/network-authority-cache.class.ts` → `libs/flux/mesh/store/redis/network-authority/src/index.ts`
- `libs/flux/mesh/store/redis/network-authority/src/index.ts` → `libs/flux/mesh/store/redis/network-authority/src/lib/network-authority-redis.service.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/main.ts` → `packages/flux/mesh/src/business-logic/processes/process.class.ts` → `packages/flux/mesh/src/register/network-authority-cache.class.ts` → `libs/flux/mesh/store/redis/network-authority/src/index.ts`
- `libs/flux/mesh/store/redis/network-authority/src/index.ts` → `libs/flux/mesh/store/redis/network-authority/src/lib/network-authority-redis.service.ts` → `packages/flux/mesh/src/index.ts` → `packages/flux/mesh/src/main.ts` → `packages/flux/mesh/src/register/network-authority-cache.class.ts` → `libs/flux/mesh/store/redis/network-authority/src/index.ts`
- `libs/flux/shared/connection/src/lib/channel-state-manager.ts` → `libs/flux/shared/connection/src/lib/flux-ws-connection.ts` → `libs/flux/shared/connection/src/lib/channel-state-manager.ts`
- `libs/flux/shared/ws/src/index.ts` → `libs/flux/shared/ws/src/lib/ws-client.ts` → `libs/flux/shared/ws/src/index.ts`

### Unused component inputs (1)

- `apps/frontend/portal/src/app/pages/dashboard-home/dashboard-home.component.spec.ts`:66 `networkId` is declared but referenced nowhere in this component (remove it or use it)

### Unused catalog entries (2)

- `bits-ui` (`default`) `package.json`:132
- `webpack-bundle-analyzer` (`default`) `package.json`:146


