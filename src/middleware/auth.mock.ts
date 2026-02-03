import { Request, Response, NextFunction } from 'express';

/**
 * Purpose: Mock authentication middleware for development/testing
 * Provides fake user context with numeric IDs (required for BigInt conversion)
 */
export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  req.user = {
    id: 1,      // Numeric ID (will be converted to BigInt)
    org_id: 1   // Numeric ID (will be converted to BigInt)
  };
  next();
};
