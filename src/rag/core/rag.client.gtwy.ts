/**
 * Purpose: GTWY RAG API client for document indexing and search
 * Replaces Hippocampus integration with GTWY RAG APIs
 */

const GTWY_RAG_API_URL = process.env.GTWY_RAG_API_URL || 'https://db.gtwy.ai';
const GTWY_RAG_QUERY_URL = process.env.GTWY_RAG_QUERY_URL || 'https://api.gtwy.ai';
const GTWY_RAG_AUTH_TOKEN = process.env.GTWY_RAG_AUTH_TOKEN || '';
const GTWY_RAG_COLLECTION_ID = process.env.GTWY_RAG_COLLECTION_ID || '';
const GTWY_RAG_COLLECTION_MODE = process.env.GTWY_RAG_COLLECTION_MODE || 'moderate';

export interface CreateResourceParams {
  title: string;
  description: string;
  content: string;
  ownerId: string;
}

export interface UpdateResourceParams {
  title: string;
  description: string;
  content: string;
}

export interface QueryParams {
  query: string;
  ownerId: string;
  limit?: number;
}

export interface QueryResult {
  docId: string;
  score?: number;
}

/**
 * Purpose: GTWY RAG client for document operations
 * Handles create, update, delete, and query operations
 */
export class GtwyRagClient {
  private apiUrl: string;
  private queryUrl: string;
  private authToken: string;
  private collectionId: string;
  private collectionMode: string;

  constructor() {
    this.apiUrl = GTWY_RAG_API_URL;
    this.queryUrl = GTWY_RAG_QUERY_URL;
    this.authToken = GTWY_RAG_AUTH_TOKEN;
    this.collectionId = GTWY_RAG_COLLECTION_ID;
    this.collectionMode = GTWY_RAG_COLLECTION_MODE;

    if (!this.authToken) {
      console.warn('[GTWY RAG] AUTH_TOKEN not configured - RAG features will be disabled');
    }
    if (!this.collectionId) {
      console.warn('[GTWY RAG] COLLECTION_ID not configured - RAG features will be disabled');
    }
  }

  /**
   * Purpose: Make HTTP request to GTWY API with retry logic
   */
  private async makeRequest(
    url: string,
    method: string,
    body?: any,
    retries: number = 2
  ): Promise<any> {
    if (!this.authToken) {
      throw new Error('GTWY RAG AUTH_TOKEN not configured');
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'pauthkey': this.authToken
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
          console.error(`[GTWY RAG] API request failed after ${retries + 1} attempts:`, error);
          throw new Error('GTWY RAG service unavailable');
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  /**
   * Purpose: Create a new resource in GTWY RAG
   * Returns the doc_id for storage in work_items.docId
   */
  public async createResource(params: CreateResourceParams): Promise<string> {
    try {
      const response = await this.makeRequest(
        `${this.apiUrl}/api/rag/resource`,
        'POST',
        {
          title: params.title,
          description: params.description,
          content: params.content,
          settings: {
            strategy: 'recursive',
            chunkSize: 4000
          },
          collection_details: this.collectionMode,
          // owner_id: params.ownerId
          owner_id: "59162"
        }
      );

      if (!response.success || !response.data?._id) {
        throw new Error('Invalid response from GTWY RAG API');
      }

      console.log(`[GTWY RAG] Created resource: ${response.data._id} for owner: ${params.ownerId}`);
      return response.data._id;
    } catch (error) {
      console.error('[GTWY RAG] Failed to create resource:', error);
      throw error;
    }
  }

  /**
   * Purpose: Update an existing resource in GTWY RAG
   * Uses the stored docId from work_items.docId
   */
  public async updateResource(docId: string, params: UpdateResourceParams): Promise<void> {
    try {
      await this.makeRequest(
        `${this.apiUrl}/api/rag/resource/${docId}`,
        'PUT',
        {
          title: params.title,
          description: params.description,
          content: params.content
        }
      );

      console.log(`[GTWY RAG] Updated resource: ${docId}`);
    } catch (error) {
      console.error(`[GTWY RAG] Failed to update resource ${docId}:`, error);
      throw error;
    }
  }

  /**
   * Purpose: Delete a resource from GTWY RAG
   * Uses the stored docId from work_items.docId
   */
  public async deleteResource(docId: string): Promise<void> {
    try {
      await this.makeRequest(
        `${this.apiUrl}/api/rag/resource/${docId}`,
        'DELETE'
      );

      console.log(`[GTWY RAG] Deleted resource: ${docId}`);
    } catch (error) {
      console.error(`[GTWY RAG] Failed to delete resource ${docId}:`, error);
      // Don't throw - deletion failures should not crash the worker
    }
  }

  /**
   * Purpose: Query GTWY RAG for relevant documents
   * Returns list of doc_ids matching the query
   */
  public async query(params: QueryParams): Promise<QueryResult[]> {
    try {
      if (!this.collectionId) {
        throw new Error('GTWY RAG COLLECTION_ID not configured');
      }

      const response = await this.makeRequest(
        `${this.queryUrl}/rag/query`,
        'POST',
        {
          collection_id: this.collectionId,
          // owner_id: params.ownerId,
          owner_id: "59162",
          query: params.query
        }
      );

      // Extract doc_ids from response
      const results: QueryResult[] = [];
      if (response.results && Array.isArray(response.results)) {
        for (const result of response.results) {
          if (result.doc_id) {
            results.push({
              docId: result.doc_id,
              score: result.score
            });
          }
        }
      }

      console.log(`[GTWY RAG] Query completed: found ${results.length} results for owner: ${params.ownerId}`);
      return results;
    } catch (error) {
      console.error('[GTWY RAG] Query failed:', error);
      throw error;
    }
  }
}
