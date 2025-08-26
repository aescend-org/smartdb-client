import type { components } from "../../shared/backend"

export type User = components["schemas"]["User"]
export type TokenData = components["schemas"]["Token"]
export type LLModel = components["schemas"]["LLModel"];
export type ChatResponse = components["schemas"]["SpecificRetriverOutput"];
export type ConversationMessage = components["schemas"]["ConversationMessage"]
export type Author = components["schemas"]["Author"]
export type LLMDetail = components["schemas"]["LLModelDetail"]

export type RawChunk             = components["schemas"]["Chunk"]
export type RawProject = components["schemas"]["ProjectResponse"]
export type RawDocument = components["schemas"]["DocumentResponse"]
export type MetaData = components["schemas"]["MetaData"]

export type SearchContent = {
  page_content: string,
  metadata: Partial<MetaData>
  type: string
}

export type SearchResult = {
  result: SearchContent,
  score: number,
  type?: 'text' | 'image'
}
