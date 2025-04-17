export type TNetworkConnectionState = 'disconnected' | 'connected' | 'connecting' | 'authorizing' | 'denied';
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

    public attachNetworkStateListener(
        fn: (networkState: TNetworkConnectionState) => void,
    ): void {
        this.networkStateListeners.add(fn);
    }

    public detachNetworkStateListener(
        fn: (networkState: TNetworkConnectionState) => void,
    ): void {
        this.networkStateListeners.delete(fn);
    }

    public attachWebRTCStateListener(
        fn: (rtcState: TRTCState) => void,
    ): void {
        this.webRTCStateListeners.add(fn);
    }

    public detachWebRTCStateListener(
        fn: (rtcState: TRTCState) => void,
    ): void {
        this.webRTCStateListeners.delete(fn);
    }

    public emitNetworkState(
        networkState: TNetworkConnectionState,
    ): void {
        for (const fn of this.networkStateListeners) {
            fn(networkState);
        }
    }

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