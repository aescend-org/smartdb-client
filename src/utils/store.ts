

export class Store implements Storage {
  private state: Record<string, string> = {};

  constructor(initialState: Record<string, string> = {}) {
    this.state = { ...initialState };
  }
  clear(): void {
    this.state = {};
  }
  getItem(key: string): string | null {
    return this.state[key] || null;
  }
  key(index: number): string | null {
    const keys = Object.keys(this.state);
    return keys[index] || null;
  }
  removeItem(key: string): void {
    delete this.state[key];
  }
  setItem(key: string, value: string): void {
    this.state[key] = value;
  }
  get length(): number {
    return Object.keys(this.state).length;
  }
}
