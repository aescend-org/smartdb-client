type ContentType = "sql" | "text" | "code"

type ChunksStats = {
  id: number
  score?: number
  index?: string // fulltext, vector, hybrid
  searchType?: string // similarity, mmr
}

type Source = {
  id: string
  docId: number
  chunkIds: number[]
  chunks: ChunksStats[]
  title: string
  url: string
  doi?: string
}

type Message = {
  id: string
  content: string
  contentType: ContentType
  table?: { [key: string]: string; }[]
  from: Author
  model?: string
  sourceIds?: string[]
  mapDocIdToContextId?: { [key: string]: number }
}
