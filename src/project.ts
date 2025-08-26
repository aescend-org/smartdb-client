import type { ISmartDBClient } from "./types/client.types";
import type { RawChunk, RawDocument, RawProject } from "./types/api.types";
import { Document } from "./document";
import { DomainCache, type Cache } from "./cache";

export class Project {
  private _data: RawProject;
  private _client?: ISmartDBClient;
  private documentCache: DomainCache<Document>;
  private chunkCache: DomainCache<RawChunk>;
  private thisDocumentIds?: Document['id'][];
  static readonly domainKey = 'project';

  constructor(
    data: RawProject,
    client: ISmartDBClient,
    cache?: Cache,
  ) {
    this._data = data;
    this._client = client;
    this.documentCache = new DomainCache<Document>(cache || new Map(), Document.domainKey);
    this.chunkCache = new DomainCache<RawChunk>(cache || new Map(), `chunk`);
  }

  get id(): RawProject["id"] { return this._data.id; }
  get name(): RawProject["name"] { return this._data.name; }
  get description(): RawProject["description"] { return this._data.description; }
  get raw(): RawProject { return this._data; }

  private get domainUri(): string {
    return `/vector/projects/${this.id}`;
  }

  private async loadDocuments(): Promise<Document[]> {
    if (!this._client) {
      throw new Error("Client not set");
    }
    const docs = await this._client._request<RawDocument[]>(`${this.domainUri}/documents`);
    return docs.map(doc => new Document(doc, this._client!, this.chunkCache));
  }

  async getDocuments(): Promise<Document[]> {
    if (this.thisDocumentIds) {
      const docs = this.thisDocumentIds.map(id => this.documentCache.get(id.toString())).filter(d => d !== undefined) as Document[];
      this.loadDocuments().then(freshDocs => {
        freshDocs.forEach(d => this.documentCache.set(d.id.toString(), d));
        this.thisDocumentIds = freshDocs.map(d => d.id);
      })
      return docs;
    }
    const docs = await this.loadDocuments();
    docs.forEach(d => this.documentCache.set(d.id.toString(), d));
    this.thisDocumentIds = docs.map(d => d.id);
    return docs;
  }
}
