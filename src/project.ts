import type { ISmartDBClient } from "./types/client.types";
import type { RawDocument, RawProject } from "./types/api.types";
import { Document } from "./document";

export class Project {
  private _data: RawProject;
  private _client?: ISmartDBClient;
  private documentCache: Map<RawDocument['id'], Document>;
  private thisDocumentIds?: Document['id'][];
  constructor(data: RawProject) {
    this._data = data;
    this.documentCache = new Map();
  }

  static from(data: RawProject, client: ISmartDBClient, documentCache?:Map<RawDocument['id'], Document>): Project {
    const project = new Project(data);
    project._client = client;
    project.documentCache = documentCache || new Map();
    return project;
  }

  get id(): RawProject["id"] {
    return this._data.id;
  }
  get name(): RawProject["name"] {
    return this._data.name;
  }
  get description(): RawProject["description"] {
    return this._data.description;
  }  
  get raw(): RawProject {
    return this._data;
  }

  private get domainUri(): string {
    return `/vector/projects/${this.id}`;
  }

  private async loadDocuments(): Promise<Document[]> {
    if (!this._client) {
      throw new Error("Client not set");
    }
    const docs = await this._client._request<RawDocument[]>(`${this.domainUri}/documents`);
    return docs.map(doc => Document.from(doc, this._client!));
  }

  async getDocuments(): Promise<Document[]> {
    if (this.thisDocumentIds) {
      const docs = this.thisDocumentIds.map(id => this.documentCache.get(id)).filter(d => d !== undefined) as Document[];
      this.loadDocuments().then(freshDocs => {
        freshDocs.forEach(d => this.documentCache.set(d.id, d));
        this.thisDocumentIds = freshDocs.map(d => d.id);
      })
      return docs;
    }
    const docs = await this.loadDocuments();
    docs.forEach(d => this.documentCache.set(d.id, d));
    this.thisDocumentIds = docs.map(d => d.id);
    return docs;
  }
}
