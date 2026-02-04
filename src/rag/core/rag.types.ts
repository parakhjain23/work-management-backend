export interface RagQueryResult {
  resourceId: string;
  score: number;
}

export interface CollectionInfo {
  collectionId: string;
  name: string;
}

export interface WorkItemDocument {
  workItemId: number;
  title: string;
  content: string;
}
