import type { ISmartDBClient } from "./types/client.types";
import type { RawChunk, RawDocument, User } from "./types/api.types";
import { DomainCache, type Cache } from "./cache";

export class Document {
  private _data: RawDocument;
  private _client?: ISmartDBClient;
  private chunkCache: DomainCache<RawChunk>;
  private thisChunkIds?: RawChunk['id'][];
  static readonly domainKey = 'document';

  constructor(
    data: RawDocument,
    client: ISmartDBClient,
    cache?: Cache
  ) {
    this._data = data;
    this._client = client;
    this.chunkCache = new DomainCache<RawChunk>(cache || new Map(), `chunk`);
  }

  get(key: string): any { return (this._data as any)[key]; }
  get raw(): RawDocument { return this._data; }
  get id(): RawDocument["id"] { return this._data.id; }
  get title(): RawDocument["title"] { return this._data.title; }
  get source(): RawDocument["source"] { return this._data.source; }
  get topics(): RawDocument["topics"] { return this._data.topics; }
  get doi(): RawDocument["doi"] { return this._data.doi; }
  get authors(): RawDocument["authors"] { return this._data.authors; }
  get ownername(): User["username"] | undefined { return this._data.owner || undefined; }
  get isPublic(): RawDocument["public"] { return this._data.public; }
  get url(): RawDocument["url"] { return this._data.url; }

  private get domainUri(): string {
    return `/vector/documents/${this.id}`;
  }

  getOwner(): Promise<User | null> {
    if (!this._client) {
      throw new Error("Client not set");
    }
    if (!this.ownername) {
      return Promise.resolve(null);
    }
    return this._client.getUserByUsername(this.ownername);
  }

  async getCitation(): Promise<string|undefined> {
    return await this._client?._request<string>(`/cite/bibtex?documents=${this.id}`, { method: 'GET' });
  }

  // @article{citationKey, ...
  async getCitationKey(): Promise<string|undefined> {
    const cite = await this.getCitation();
    if (!cite) return undefined;
    const match = cite.match(/@(\w+)\{([^,]+),/);
    return match ? match[2] : undefined;
  }

  private async loadChunks(): Promise<RawChunk[]> {
    if (!this._client) {
      throw new Error("Client not set");
    }
    const chunks = await this._client._request<RawChunk[]>(`${this.domainUri}/chunks`);
    return chunks;
  }

  async getChunks(): Promise<RawChunk[]> {
    if (this.thisChunkIds) {
      const chunks = this.thisChunkIds.map(id => this.chunkCache.get(id.toString())).filter(c => c !== undefined) as RawChunk[];
      this.loadChunks().then(freshChunks => {
        freshChunks.forEach(c => this.chunkCache.set(c.id.toString(), c));
        this.thisChunkIds = freshChunks.map(c => c.id);
      })
      return chunks;
    }
    const chunks = await this.loadChunks();
    chunks.forEach(c => this.chunkCache.set(c.id.toString(), c));
    this.thisChunkIds = chunks.map(c => c.id);
    return chunks;
  }
}
