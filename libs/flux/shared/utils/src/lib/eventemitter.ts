type TListener<T = any> = (payload: T) => void;

export class EventEmitter<T extends Record<string, any>> {
    private listeners: { [K in keyof T]?: TListener<T[K]>[] } = {};

    /**
     * Registers a listener for the given event.
     */
    on<K extends keyof T>(
        event: K,
        listener: TListener<T[K]>,
    ): this {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event]?.push(listener);

        return this;
    }

    /**
     * Removes a listener for the given event.
     */
    off<K extends keyof T>(
        event: K,
        listener: TListener<T[K]>,
    ): number {
        this.listeners[event] = this.listeners[event]?.filter(l => l !== listener);

        const listenerCount: number = this.listeners[event]?.length ?? 0;

        if (listenerCount === 0) {
            delete this.listeners[event];
        }

        return listenerCount;
    }

    /**
     * Emits the given event with the given payload.
     */
    emit<K extends keyof T>(
        event: K,
        payload: T[K],
    ) {
        for (const listener of this.listeners[event] ?? []) {
            listener(payload);
        }
    }
}