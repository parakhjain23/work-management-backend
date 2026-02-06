import { Request, Response } from 'express';
import { getPrismaClient } from '../db/prisma.js';
import { GtwyRagClient } from './core/rag.client.gtwy.js';

const ragClient = new GtwyRagClient();

export const ragSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, limit, orgId } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Query is required'
      });
      return;
    }

    if (!orgId) {
      res.status(401).json({
        success: false,
        error: 'orgId/OwnerId is required'
      });
      return;
    }

    const searchLimit = typeof limit === 'number' ? limit : 5;
    const ownerId = orgId.toString();

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
        work_items: [],
        message: "No relevant work items found"
      });
      return;
    }

    // Query database to get work items by docId
    const prisma = getPrismaClient();
    const workItems = await prisma.workItem.findMany({
      where: {
        docId: { in: docIds },
        orgId: Number(orgId)
      },
      select: { id: true, title: true, description: true, status: true, priority: true, dueDate: true, assigneeId: true },
      orderBy: { id: 'desc' }
    });

    res.json({
      success: true,
      work_items: workItems,
      message: "Found relevant work items"
    });

  } catch (error) {
    console.error('RAG search error:', error);
    res.status(500).json({
      success: false,
      error: 'RAG search failed'
    });
  }
};

