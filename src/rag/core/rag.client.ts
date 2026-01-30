const HIPPOCAMPUS_API_URL = process.env.HIPPOCAMPUS_API_URL || 'https://api.hippocampus.ai';
const HIPPOCAMPUS_API_KEY = process.env.HIPPOCAMPUS_API_KEY || '';

export interface RagQueryResult {
  resourceId: string;
  score: number;
}

export interface CollectionInfo {
  collectionId: string;
  name: string;
}

export class RagClient {
  private apiUrl: string;
  private apiKey: string;
  private collectionCache: Map<string, string> = new Map();

  constructor() {
    this.apiUrl = HIPPOCAMPUS_API_URL;
    this.apiKey = HIPPOCAMPUS_API_KEY;

    if (!this.apiKey) {
      console.warn('HIPPOCAMPUS_API_KEY not configured - RAG features will be disabled');
    }
  }

  private async makeRequest(
    endpoint: string,
    method: string,
    body?: any,
    retries: number = 2
  ): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Hippocampus API key not configured');
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${this.apiUrl}${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
          },
          body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
      } catch (error) {
        if (attempt === retries) {
          console.error(`RAG API request failed after ${retries + 1} attempts:`, error);
          throw new Error('RAG service unavailable');
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  public async createCollection(orgId: string): Promise<string> {
    const cached = this.collectionCache.get(orgId);
    if (cached) {
      return cached;
    }

    const collectionName = `org:${orgId}`;
    
    try {
      const response = await this.makeRequest('/collection', 'POST', {
        name: collectionName,
        settings: {
          denseModel: 'BAAI/bge-large-en-v1.5',
          sparseModel: 'Qdrant/bm25',
          rerankerModel: 'colbert-ir/colbertv2.0',
          chunkSize: 1000,
          chunkOverlap: 100
        }
      });
      
      const collectionId = response.collectionId || response.id;
      this.collectionCache.set(orgId, collectionId);
      console.log(`[RAG] Created collection: ${collectionName} (ID: ${collectionId})`);
      return collectionId;
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log(`[RAG] Collection already exists: ${collectionName}`);
        const collectionId = `existing_${orgId}`;
        this.collectionCache.set(orgId, collectionId);
        return collectionId;
      }
      throw error;
    }
  }

  public async addResource(
    collectionId: string,
    resourceId: string,
    title: string,
    content: string,
    ownerId: string
  ): Promise<void> {
    await this.makeRequest('/resource', 'POST', {
      collectionId,
      title,
      content,
      ownerId
    });
    
    console.log(`[RAG] Added resource: ${resourceId} to collection ${collectionId}`);
  }

  public async updateResource(
    resourceId: string,
    title: string,
    content: string
  ): Promise<void> {
    await this.makeRequest(`/resource/${resourceId}`, 'PUT', {
      title,
      content
    });
    
    console.log(`[RAG] Updated resource: ${resourceId}`);
  }

  public async deleteResource(resourceId: string): Promise<void> {
    try {
      await this.makeRequest(`/resource/${resourceId}`, 'DELETE');
      console.log(`[RAG] Deleted resource: ${resourceId}`);
    } catch (error) {
      console.error(`[RAG] Failed to delete resource ${resourceId}:`, error);
    }
  }

  public async query(
    collectionId: string,
    queryText: string,
    ownerId: string,
    limit: number = 5,
    minScore: number = 0.75
  ): Promise<RagQueryResult[]> {
    const response = await this.makeRequest('/search', 'POST', {
      query: queryText,
      collectionId,
      ownerId,
      limit,
      minScore
    });
    
    return response.results || [];
  }
}
