import { Request, Response } from 'express';
import { GtwyRagClient } from './core/rag.client.gtwy.js';
import { getPrismaClient } from '../db/prisma.js';

const ragClient = new GtwyRagClient();

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

    const searchLimit = typeof limit === 'number' ? limit : 5;
    const ownerId = req.user.org_id.toString();

    // Query GTWY RAG API
    const results = await ragClient.query({
      query,
      ownerId,
      limit: searchLimit
    });

    // Extract doc_ids from results
    const docIds = results.map(r => r.docId);

    if (docIds.length === 0) {
      res.json({
        success: true,
        work_item_ids: []
      });
      return;
    }

    // Query database to get work items by docId
    const prisma = getPrismaClient();
    const placeholders = docIds.map((_, i) => `$${i + 1}`).join(', ');
    const workItems = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id FROM work_items 
      WHERE doc_id IN (${docIds.map(id => `'${id}'`).join(', ')})
      AND org_id = ${req.user.org_id}
      ORDER BY id DESC
    `);

    const workItemIds = workItems.map(item => Number(item.id));

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

