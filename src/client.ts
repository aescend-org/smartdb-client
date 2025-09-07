import type { ClientOptions, ISmartDBClient } from "./types/client.types";
import { Project } from "./project";
import type { ChatResponse, ConversationMessage, LLModel, RawChunk, RawDocument, RawProject, SearchResult, TokenData, User } from "./types/api.types";
import { Store } from "./utils/store";
import { validUrl } from "./utils/url";
import { Document } from "./document";
import { DomainCache, InMemoryCache, type Cache } from "./cache";

export class SmartDBClient implements ISmartDBClient {
  private baseUrl: string;
  private storage: Storage; // for persisting token across sessions
  private cache: Cache; // for caching domain objects

  public verbose: boolean = false;

  public onLoginSuccess?: () => void;
  public onLogout?: () => void;

  constructor(url: string, opt?: ClientOptions) {
    this.baseUrl = validUrl(url);
    this.verbose = opt?.verbose || false;
    this.storage = opt?.storage || new Store();
    this.cache = opt?.cache || new InMemoryCache();

    if (this.verbose) {
      console.debug(`SmartDBClient initialized with baseUrl: ${this.baseUrl}`);
    }
  }

  get url(): string {
    return this.baseUrl;
  }

  get isLoggedIn(): boolean {
    return this.token !== null;
  }

  private get token(): string | null {
    return this.storage.getItem('token');
  }
  private set token(value: string | null) {
    if (value) {
      this.storage.setItem('token', value);
    } else {
      this.storage.removeItem('token');
    }
  }

  async _request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, any> = options.headers || {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (headers['Content-Type'] === undefined && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    options.headers = headers;
    if (this.verbose) console.debug('Requesting', this.baseUrl + path, options);
    const res = await fetch(this.baseUrl + path, options);
    if (!res.ok) {
      if (res.status === 401) {
        this.token = null; // clear token on unauthorized
      }
      throw new Error(`Request failed with status ${res.status}`);
    }
    return await res.json() as Promise<T>;
  }

  async login(username: string, password: string): Promise<void> {
    const data = new FormData();
    data.append('grant_type', 'password');
    data.append('username', username);
    data.append('password', password);
    data.append('client_id', 'frontend');
    data.append('client_secret', '');
    data.append('scope', '');
    const resp = await fetch(this.baseUrl + '/token', {
      method: 'POST',
      body: data
    }).then(async res => {
      if (!res.ok) {
        throw new Error('Failed to get token');
      }
      return await res.json() as Promise<TokenData>;
    });
    if (!resp.access_token) {
      throw new Error('No access token in response');
    }
    this.token = resp.access_token;
    this.onLoginSuccess?.();
    if (this.verbose) console.debug('Login successful, token stored');
  }

  async logout(): Promise<void> {
    this.cache.clear?.();
    this.token = null;
    this.onLogout?.();
    if (this.verbose) console.debug('Logged out, token cleared');
  }

  async getCurrentUser(): Promise<User> {
    return await this._request<User>('/users/me');
  }

  async semanticSearch(query: string, project?: Project['id']): Promise<SearchResult[]> {
    const queryParams = new URLSearchParams({ query });
    if (project) {
      queryParams.append('project', project.toString());
    }
    return await this._request<SearchResult[]>('/semantic-search?' + queryParams.toString());
  }

  async chat(question: string, model: LLModel, projectId?: string | number, include?: string[], exclude?: string[], conversation?: ConversationMessage[]): Promise<ChatResponse> {
    return await this._request<ChatResponse>('/chat', {
      method: 'POST',
      body: {
        // @ts-ignore
        query: question,
        model: model,
        include: include || [],
        exclude: exclude || [],
        conversation: conversation || [],
        project: projectId || null
      }
    })
  }

  async getProjects(): Promise<Project[]> {
    const rawProjects = await this._request<RawProject[]>('/vector/projects');
    const projects = rawProjects.map(p => new Project(p, this, this.cache));
    projects.forEach(p => this.projectCache.set(p.id.toString(), p));
    return projects;
  }

  async getProjectById(id: RawProject['id']): Promise<Project> {
    if (this.projectCache.has(id.toString())) {
      if (this.verbose) console.debug(`Project ${id} found in cache`);
      return this.projectCache.get(id.toString())!;
    }
    const rawProject = await this._request<RawProject>(`/vector/projects/${id}`);
    const project = new Project(rawProject, this, this.cache);
    return project;
  }

  async getDocuments(): Promise<Document[]> {
    const docs = await this._request<{ documents: any[] }>(`/vector/documents`);
    const documents = docs.documents.map(doc => new Document(doc, this, this.cache));
    documents.forEach(d => this.documentCache.set(d.id.toString(), d));
    return documents;
  }

  async getDocumentById(id: Document['id']): Promise<Document> {
    if (this.documentCache.has(id.toString())) {
      if (this.verbose) console.debug(`Document ${id} found in cache`);
      return this.documentCache.get(id.toString())!;
    }
    const doc = await this._request<any>(`/vector/documents/${id}`);
    const document = new Document(doc, this, this.chunkCache);
    this.documentCache.set(document.id.toString(), document);
    return document;
  }

  async getDocumentByChunkId(chunkId: RawChunk['id']): Promise<Document | null> {
    try {
      const doc = await this._request<RawDocument>(`/vector/chunks/${chunkId}/document`);
      const document = new Document(doc, this, this.chunkCache);
      this.documentCache.set(document.id.toString(), document);
      return document;
    } catch (e) {
      return null;
    }
  }

  async getDocumentByTitle(title: RawDocument['title']): Promise<Document | null> {
    const doc = await this._request<{ 
      document: RawDocument 
    }>(
      `/vector/documents/by-title/${encodeURI(title as string).replace(/\?/g, '%3F').replace(/&/g, '%26')}`
    );
    if (!doc.document) return null;
    const document = new Document(doc.document, this, this.chunkCache);
    this.documentCache.set(document.id.toString(), document);
    return document;
  }

  async getChunkById(id: RawChunk['id']): Promise<RawChunk> {
    if (this.chunkCache.has(id.toString())) {
      if (this.verbose) console.debug(`Chunk ${id} found in cache`);
      return this.chunkCache.get(id.toString())!;
    }
    const chunk = await this._request<RawChunk>(`/vector/chunks/${id}`);
    this.chunkCache.set(chunk.id.toString(), chunk);
    return chunk;
  }

  async getUserByUsername(username: User['username']): Promise<User | null> {
    if (this.userCache.has(username)) {
      if (this.verbose) console.debug(`User ${username} found in cache`);
      return this.userCache.get(username)!;
    }
    try {
      const user = await this._request<User>(`/users/by-username/${username}`);
      this.userCache.set(user.username, user);
      return user;
    } catch (e) {
      return null;
    }
  }

  async getUserById(id: User['id']): Promise<User | null> {
    if ([...this.userCache.values()].some(u => u.id === id)) {
      return [...this.userCache.values()].find(u => u.id === id)!;
    }
    try {
      const user = await this._request<User>(`/users/${id}`);
      this.userCache.set(user.username, user);
      return user;
    } catch (e) {
      return null;
    }
  }

  private get projectCache(): DomainCache<Project> {
    return new DomainCache<Project>(this.cache, Project.domainKey);
  }

  private get documentCache(): DomainCache<Document> {
    return new DomainCache<Document>(this.cache, Document.domainKey);
  }

  private get chunkCache(): DomainCache<RawChunk> {
    return new DomainCache<RawChunk>(this.cache, 'chunk');
  }

  private get userCache(): DomainCache<User> {
    return new DomainCache<User>(this.cache, 'user');
  }
}

