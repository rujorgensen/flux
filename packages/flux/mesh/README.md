```TypeScript
import { FluxMeshServer } from '@persistica/flux-mesh';

const fluxMeshServer: FluxMeshServer = new FluxMeshServer();

fluxMeshServer.onReady(() => {
    console.log('🚀 Mesh server running! Ready to receive connections.');
});

```