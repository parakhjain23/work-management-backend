import { Request, Response } from 'express';
import { SqlService } from './sql.service.js';

const sqlService = new SqlService();

export const executeSql = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sql, threadId } = req.body;

    if (!sql || typeof sql !== 'string') {
      res.status(400).json({
        success: false,
        error: 'SQL query is required'
      });
      return;
    }

    const result = await sqlService.executeSql(sql, threadId);

    if (!result.success) {
      if (result.error?.includes('not in the whitelist') || 
          result.error?.includes('Blocked keyword') ||
          result.error?.includes('Multiple statements') ||
          result.error?.includes('WHERE clause') ||
          result.error?.includes('scope violation')) {
        res.status(403).json(result);
        return;
      }

      if (result.error?.includes('immutable') ||
          result.error?.includes('cannot be its own parent') ||
          result.error?.includes('Physical deletion') ||
          result.error?.includes('status')) {
        res.status(409).json(result);
        return;
      }

      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('SQL execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during SQL execution'
    });
  }
};
