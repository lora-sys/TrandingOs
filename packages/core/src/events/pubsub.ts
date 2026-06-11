export type EventType = "created" | "updated" | "deleted";
export type Event<T> = { type: EventType; data: T; timestamp: number };

export class PubSub<T extends { id: string }> {
  private subscribers = new Map<string, Set<(event: Event<T>) => void>>();
  private allSubscribers = new Set<(event: Event<T>) => void>();

  subscribe(key: string, fn: (event: Event<T>) => void): () => void {
    if (!this.subscribers.has(key)) this.subscribers.set(key, new Set());
    this.subscribers.get(key)!.add(fn);
    return () => this.subscribers.get(key)?.delete(fn);
  }

  subscribeAll(fn: (event: Event<T>) => void): () => void {
    this.allSubscribers.add(fn);
    return () => this.allSubscribers.delete(fn);
  }

  publish(type: EventType, data: T): void {
    const event: Event<T> = { type, data, timestamp: Date.now() };
    this.subscribers.get(data.id)?.forEach(fn => fn(event));
    this.allSubscribers.forEach(fn => fn(event));
  }

  clear(): void {
    this.subscribers.clear();
    this.allSubscribers.clear();
  }
}
