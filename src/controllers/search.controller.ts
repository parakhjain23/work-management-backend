import { Request, Response } from 'express';
import { WorkItemsService, SearchWorkItemsParams } from '../services/workItems.service.js';
import { serializeBigInt } from '../utils/bigint.serializer.js';

const workItemsService = new WorkItemsService();

/**
 * Purpose: Search work items by query matching title or description
 * Returns work items where title or description contains the search query
 */
export const searchWorkItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, limit, offset } = req.query;

    if (!req.user || !req.user.org_id) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
      return;
    }

    const searchParams: SearchWorkItemsParams = {
      query,
      limit: limit ? parseInt(limit as string, 10) : 20,
      offset: offset ? parseInt(offset as string, 10) : 0
    };

    const workItems = await workItemsService.search(req.user.org_id, searchParams);

    res.json({
      success: true,
      data: serializeBigInt(workItems),
      count: workItems.length
    });
  } catch (error) {
    console.error('Search work items error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search work items'
    });
  }
};
