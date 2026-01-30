type FileSearchTool = {
  type: 'file_search';
  vector_store_ids: string[];
  max_num_results?: number;
};

export const VECTOR_STORE_ID = process.env.OPENAI_VECTOR_STORE_ID ?? '';

export function buildFileSearchTool(vectorStoreId = VECTOR_STORE_ID): FileSearchTool | null {
  if (!vectorStoreId) return null;
  return {
    type: 'file_search',
    vector_store_ids: [vectorStoreId],
    max_num_results: 4,
  };
}

export function hasFileSearchResults(response: unknown): boolean {
  if (!response || typeof response !== 'object') return false;
  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) return false;
  return output.some((item) => {
    if (!item || typeof item !== 'object') return false;
    const type = (item as { type?: string }).type ?? '';
    if (type.toLowerCase().includes('file_search')) return true;
    const name = (item as { name?: string }).name ?? '';
    if (name.toLowerCase().includes('file_search')) return true;
    const tool = (item as { tool?: { type?: string } }).tool;
    return tool?.type === 'file_search';
  });
}
