import type { components } from "../types/backend"
import { Store } from "./utils/store";
import { validUrl } from "./utils/url";

export type User = components["schemas"]["User"]
export type TokenData = components["schemas"]["Token"]
export type Project = components["schemas"]["ProjectResponse"]
export type LLModel = components["schemas"]["LLModel"];
export type ChatResponse = components["schemas"]["SpecificRetriverOutput"];
export type ConversationMessage = components["schemas"]["ConversationMessage"]
export type Author = components["schemas"]["Author"]
export type LLMDetail = components["schemas"]["LLModelDetail"]

export class SmartDBClient {
  private baseUrl: string;
  private storage: Storage;

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

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    this.token = null;
  }

  async getCurrentUser(): Promise<User> {
    return await this.request<User>('/users/me');
  }

  async semanticSearch(query: string, project?: Project['id']): Promise<SearchResult[]> {
    const queryParams = new URLSearchParams({ query });
    if (project) {
      queryParams.append('project', project.toString());
    }
    return await this.request<SearchResult[]>('/semantic-search?'+queryParams.toString());
  }

  async chat(question: string, model:LLModel, projectId?: string|number, include?: string[], exclude?: string[], conversation?: ConversationMessage[]) : Promise<ChatResponse> {
    return await this.request<ChatResponse>('/chat', {
      method: 'POST',
      body: {
        query: question,
        model: model,
        include: include || [],
        exclude: exclude || [],
        conversation: conversation || [],
        project: projectId || null
      }
    })
  }
}
