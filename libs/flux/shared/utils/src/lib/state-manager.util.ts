export type TNetworkConnectionState = 'disconnected' | 'connected' | 'connecting' | 'authorizing' | 'denied' | 'auth-error';
export type TRTCState = 'idle' |
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