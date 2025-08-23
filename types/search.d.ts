
type SearchContent = {
  page_content: string,
  metadata: Partial<MetaData>
  type: string
}

type SearchResult = {
  result: SearchContent,
  score: number,
  type?: 'text' | 'image'
}
