import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Purpose: Proxy authentication middleware for production
 * Validates JWT token from proxy service and populates user context
 */

interface TokenData {
  ip: string;
  org: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    meta: string;
    email: string;
  };
  userEmail: string;
}
/**
 * Purpose: Validate token with proxy service
 * In production, this would call your actual proxy auth service
 */

function validateToken(token: string): TokenData {
  const tokenSecret = process.env.TOKEN_SECRET_KEY;
  if (!tokenSecret) throw new Error('Token secret not found');
  const decodedToken = jwt.verify(token, tokenSecret) as TokenData;
  return decodedToken;
}

/**
 * Purpose: Proxy authentication middleware
 * Validates token, ensures user exists, populates req.user
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header or query param
    let token = req.header('Authorization')
      ? req.header('Authorization')?.replace('Bearer ', '')
      : req.query.token?.toString();

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. No token provided.'
      });
      return;
    }

    // Validate token with proxy service
    const payload: TokenData = await validateToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    // Map to req.user for backward compatibility with existing code
    req.user = {
      id: Number(payload.user.id),
      email: payload.user.email,
      avatar: payload.user.meta || '',
      name: payload.user.meta || 'User',
      org_id: Number(payload.org.id),
      org_name: payload.org.name
    };

    next();
  } catch (error) {
    console.error('[Proxy Auth] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};
