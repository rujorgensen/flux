export type TNetworkConnectionState =
    'disconnected' |
    'connected' |
    'connecting' |
    'authorizing' |
    // Emitted while an Agent is authenticated but no Authority is yet registered
    // on the network. The Agent keeps retrying until an Authority appears or the
    // connect budget is exhausted. Surfacing this avoids an indefinite, silent
    // 'authorizing' when a project runs an Agent without an Authority.
    'waiting-for-authority' |
    'denied' |
    'auth-error' |
    'kicked';

export type TRTCState =
    'idle' |
    'creating-offer' |
    'setting-remote-offer' |
    'creating-answer' |
    'setting-remote-answer' |
    'connected' |
    'failed'
    ;

export class StateManager {
    private readonly networkStateListeners: Set<(networkState: TNetworkConnectionState) => void> = new Set();
    private readonly webRTCStateListeners: Set<(rtcState: TRTCState) => void> = new Set();
    private readonly directMessageListeners: Set<(message: string) => void> = new Set();

    /**
     * Attaches a listener for network connection state changes.
     */
    public attachNetworkStateListener(
        fn: (networkState: TNetworkConnectionState) => void,
    ): void {
        this.networkStateListeners.add(fn);
    }

    /**
     * Detaches a previously registered network connection state listener.
     */
    public detachNetworkStateListener(
        fn: (networkState: TNetworkConnectionState) => void,
    ): void {
        this.networkStateListeners.delete(fn);
    }

    /**
     * Attaches a listener for WebRTC connection state changes.
     */
    public attachWebRTCStateListener(
        fn: (rtcState: TRTCState) => void,
    ): void {
        this.webRTCStateListeners.add(fn);
    }

    /**
     * Detaches a previously registered WebRTC connection state listener.
     */
    public detachWebRTCStateListener(
        fn: (rtcState: TRTCState) => void,
    ): void {
        this.webRTCStateListeners.delete(fn);
    }

    /**
     * Attaches a listener for messages received directly from a peer over a
     * WebRTC data channel (i.e. off-Mesh, peer-to-peer).
     */
    public attachDirectMessageListener(
        fn: (message: string) => void,
    ): void {
        this.directMessageListeners.add(fn);
    }

    /**
     * Detaches a previously registered direct-message listener.
     */
    public detachDirectMessageListener(
        fn: (message: string) => void,
    ): void {
        this.directMessageListeners.delete(fn);
    }

    /**
     * Emits a message received over a peer-to-peer WebRTC data channel to all
     * registered listeners.
     */
    public emitDirectMessage(
        message: string,
    ): void {
        for (const fn of this.directMessageListeners) {
            fn(message);
        }
    }

    /**
     * Emits a network connection state change to all registered listeners.
     */
    public emitNetworkState(
        networkState: TNetworkConnectionState,
    ): void {
        for (const fn of this.networkStateListeners) {
            fn(networkState);
        }
    }

    /**
     * Emits a WebRTC connection state change to all registered listeners.
     */
    public emitWebRTCState(
        rtcState: TRTCState,
    ): void {
        for (const fn of this.webRTCStateListeners) {
            fn(rtcState);
        }
    }
    /*
        public clear(
    
        ): void {
            this.networkStateListeners.clear();
            this.webRTCStateListeners.clear();
        }
    
        public getNetworkStateListeners(
    
        ): Set<(networkState: TNetworkConnectionState) => void> {
            return this.networkStateListeners;
        }
    
        public getWebRTCStateListeners(
    
        ): Set<(rtcState: TRTCState) => void> {
            return this.webRTCStateListeners;
        }
    
        public getNetworkStateListenersCount(
    
        ): number {
            return this.networkStateListeners.size;
        }
    
        public getWebRTCStateListenersCount(
    
        ): number {
            return this.webRTCStateListeners.size;
        }
     */
}