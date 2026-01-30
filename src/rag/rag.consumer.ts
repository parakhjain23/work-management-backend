import { Request, Response } from 'express';
import { RagClient } from './rag.client.js';
import { getPrismaClient } from '../db/prisma.js';

const ragClient = new RagClient();

export const ragSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, limit, minScore } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Query is required'
      });
      return;
    }

    if (!req.user || !req.user.org_id) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const collectionId = await getCollectionId(req.user.org_id.toString());
    if (!collectionId) {
      res.json({
        success: true,
        work_item_ids: []
      });
      return;
    }

    const searchLimit = typeof limit === 'number' ? limit : 5;
    const searchMinScore = typeof minScore === 'number' ? minScore : 0.75;
    const ownerId = `org:${req.user.org_id.toString()}`;

    const results = await ragClient.query(
      collectionId,
      query,
      ownerId,
      searchLimit,
      searchMinScore
    );

    const workItemIds = results
      .map(r => {
        const match = r.resourceId.match(/^workItem:(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((id): id is number => id !== null);

    res.json({
      success: true,
      work_item_ids: workItemIds
    });

  } catch (error) {
    console.error('RAG search error:', error);
    res.status(500).json({
      success: false,
      error: 'RAG search failed'
    });
  }
};

async function getCollectionId(orgId: string): Promise<string | null> {
  try {
    return await ragClient.createCollection(orgId);
  } catch (error) {
    console.error('Failed to get collection ID:', error);
    return null;
  }
}
