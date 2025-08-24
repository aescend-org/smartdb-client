import type { ISmartDBClient } from "./types/client.types";
import { Project } from "./project";
import type { ChatResponse, ConversationMessage, LLModel, RawProject, TokenData, User } from "./types/api.types";
import { Store } from "./utils/store";
import { validUrl } from "./utils/url";
import { Document } from "./document";

export class SmartDBClient implements ISmartDBClient {
  private baseUrl: string;
  private storage: Storage;
  private userCache: Map<User['username'], User> = new Map();
  private projectCache: Map<Project['id'], Project> = new Map();
  private documentCache: Map<Document['id'], Document> = new Map();

  constructor(url: string, storage: Storage = new Store()) {
    this.baseUrl = validUrl(url);
    this.storage = storage;
  }

  get url(): string {
    return this.baseUrl;
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
    console.log('Requesting', this.baseUrl + path, options);
    const res = await fetch(this.baseUrl + path, options);
    if (!res.ok) {
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
  }

  async logout(): Promise<void> {
    this.uncacheAll();
    this.token = null;
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
    const projects = rawProjects.map(p => Project.from(p, this));
    projects.forEach(p => this.projectCache.set(p.id, p));
    return projects;
  }

  async getProjectById(id: RawProject['id']): Promise<Project> {
    if (this.projectCache.has(id)) {
      return this.projectCache.get(id)!;
    }
    const rawProject = await this._request<RawProject>(`/vector/projects/${id}`);
    const project = Project.from(rawProject, this);
    this.projectCache.set(project.id, project);
    return project;
  }

  async getDocuments(): Promise<Document[]> {
    const docs = await this._request<{ documents: any[] }>(`/vector/documents`);
    const documents = docs.documents.map(doc => Document.from(doc, this));
    documents.forEach(d => this.documentCache.set(d.id, d));
    return documents;
  }

  async getDocumentById(id: Document['id']): Promise<Document> {
    if (this.documentCache.has(id)) {
      return this.documentCache.get(id)!;
    }
    const doc = await this._request<any>(`/vector/documents/${id}`);
    const document = Document.from(doc, this);
    this.documentCache.set(document.id, document);
    return document;
  }

  async getUserByUsername(username: User['username']): Promise<User | null> {
    if (this.userCache.has(username)) {
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

  uncacheAll() {
    this.userCache.clear();
    this.projectCache.clear();
    this.documentCache.clear();
  }

  uncacheUser(username: User['username']) {
    this.userCache.delete(username);
  }
  uncacheProject(id: Project['id']) {
    this.projectCache.delete(id);
  }
  uncacheDocument(id: Document['id']) {
    this.documentCache.delete(id);
  }
}
