import type { ChatResponse, ConversationMessage, LLModel, RawDocument, RawProject, TokenData, User } from "./api.types";
import type { Project } from "../project";

export interface ISmartDBClient {
  login(username: string, password: string): Promise<void>;
  _request<T>(path: string, options?: RequestInit): Promise<T>;
  logout(): void;
  get url(): string;
  get isLoggedIn(): boolean;
  chat(question: string, model:LLModel, projectId?: string|number, include?: string[], exclude?: string[], conversation?: ConversationMessage[]) : Promise<ChatResponse>;
  semanticSearch(query: string, project?: RawProject['id']): Promise<SearchResult[]>;
  getProjects(): Promise<Project[]>;
  getProjectById(id: RawProject['id']): Promise<Project | null>;
  getDocuments(): Promise<Document[]>
  getDocumentById(id: RawDocument['id']): Promise<Document | null>;
  getUserByUsername(username: User['username']): Promise<User | null>;
  getUserById(id: User['id']): Promise<User | null>;

  // hooks
  onLoginSuccess?: () => void;
}
