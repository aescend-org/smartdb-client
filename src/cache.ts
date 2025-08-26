
export interface Cache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  values(): IterableIterator<any>;
  has(key: string): boolean;
  delete(key: string): void;
  clear?(): void;
}


export class DomainCache<T> implements Cache {
  private cache: Cache;
  private domainKey: string;

  constructor(cache: Cache, domainKey: string) {
    this.cache = cache;
    this.domainKey = domainKey;
  }

  get<V = T>(key: string): V | null {
    return this.cache.get<V>(`${this.domainKey}:${key}`);
  }

  set<V = T>(key: string, value: V): void {
    this.cache.set<V>(`${this.domainKey}:${key}`, value);
  }

  delete(key: string): void {
    this.cache.delete(`${this.domainKey}:${key}`);
  }

  has(key: string): boolean {
    return this.cache.get(`${this.domainKey}:${key}`) !== null;
  }

  values(): IterableIterator<T> {
    const allValues = this.cache.values();
    const domainValues: T[] = [];
    for (const value of allValues) {
      if (value && typeof value === 'object' && ('domainKey' in value) && (value as any).domainKey === this.domainKey) {
        domainValues.push(value as T);
      }
    }
    return domainValues[Symbol.iterator]();
  }
}

export class InMemoryCache implements Cache {
  private store: Map<string, any>;

  constructor() {
    this.store = new Map();
  }

  get<T>(key: string): T | null {
    return this.store.has(key) ? this.store.get(key) as T : null;
  }

  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  values(): IterableIterator<any> {
    return this.store.values();
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export class LocalStorageCache implements Cache {
  private prefix: string;

  constructor(prefix: string = 'app_cache_') {
    this.prefix = prefix;
  }

  private getFullKey(key: string): string {
    return this.prefix + key;
  }

  get<T>(key: string): T | null {
    const item = localStorage.getItem(this.getFullKey(key));
    return item ? JSON.parse(item) as T : null;
  }

  set<T>(key: string, value: T): void {
    localStorage.setItem(this.getFullKey(key), JSON.stringify(value));
  }

  delete(key: string): void {
    localStorage.removeItem(this.getFullKey(key));
  }

  values(): IterableIterator<any> {
    const items: any[] = [];
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          items.push(JSON.parse(item));
        }
      });
    return items[Symbol.iterator]();
  }

  has(key: string): boolean {
    return localStorage.getItem(this.getFullKey(key)) !== null;
  }

  clear(): void {
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .forEach(key => localStorage.removeItem(key));
  }
}
