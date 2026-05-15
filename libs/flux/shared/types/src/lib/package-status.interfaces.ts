export interface IPackageStatus {
    txNode: string; // The node that sent the package
    rxNode: string; // The intended recipient of the package NB! COULD BE room
    timeMs: number; // The time it took to send the package
    status: 'RECEIVED' |
    'FAILED-TIMEOUT' 
    // 'FAILED-RETRIES-EXHAUSTED' |
    // 'FAILED-CLIENT-GONE'
    ;
    transport: 'webrtc' // Local
    | 'process'
    | 'ipc' // Interprocess event 
    | 'global' // Reached globally 
    ;
}
