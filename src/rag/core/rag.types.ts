export interface RagQueryResult {
  resourceId: string;
  score: number;
}

export interface CollectionInfo {
  collectionId: string;
  name: string;
}

export interface WorkItemDocument {
  workItemId: bigint;
  title: string;
  content: string;
}
