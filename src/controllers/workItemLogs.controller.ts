import { Request, Response } from 'express';
import { WorkItemLogsService } from '../services/workItemLogs.service.js';

const workItemLogsService = new WorkItemLogsService();

export const getWorkItemLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const workItemIdParam = req.params.workItemId;
    if (Array.isArray(workItemIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid work item ID' });
      return;
    }
    const workItemId = Number(workItemIdParam);
    const orgId = Number(req.user!.org_id);

    const logs = await workItemLogsService.findByWorkItem(workItemId, orgId);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Work item not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch work item logs'
    });
  }
};
