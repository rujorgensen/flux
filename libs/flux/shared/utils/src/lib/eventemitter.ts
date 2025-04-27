type TListener<T = any> = (payload: T) => void;

export class EventEmitter<T extends Record<string, any>> {
	private listeners: { [K in keyof T]?: TListener<T[K]>[] } = {};

	on<K extends keyof T>(
		event: K,
		listener: TListener<T[K]>,
	) {
		if (!this.listeners[event]) this.listeners[event] = [];
		this.listeners[event]?.push(listener);

		return this;
	}

	off<K extends keyof T>(
		event: K,
		listener: TListener<T[K]>,
	) {
		this.listeners[event] = this.listeners[event]?.filter(l => l !== listener);
	}

	emit<K extends keyof T>(
		event: K,
		payload: T[K],
	) {
		for (const listener of this.listeners[event] ?? []) {
			listener(payload);
		}
	}
}