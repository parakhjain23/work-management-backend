import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Purpose: Proxy authentication middleware for production
 * Validates JWT token from proxy service and populates user context
 */

interface ProxyTokenPayload {
  userId: string;
  email: string;
  orgId: string;
  orgName: string;
  name?: string;
  avatar?: string;
}

/**
 * Purpose: Validate token with proxy service
 * In production, this would call your actual proxy auth service
 */
async function validateToken(token: string): Promise<ProxyTokenPayload | null> {
  try {
    // TODO: Replace with actual proxy service validation
    // For now, decode without verification (DEVELOPMENT ONLY)
    const decoded = jwt.decode(token) as any;
    
    if (!decoded || !decoded.userId || !decoded.orgId) {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email || `user${decoded.userId}@example.com`,
      orgId: decoded.orgId,
      orgName: decoded.orgName || `Org ${decoded.orgId}`,
      name: decoded.name || 'User',
      avatar: decoded.avatar || ''
    };
  } catch (error) {
    console.error('[Proxy Auth] Token validation failed:', error);
    return null;
  }
}


/**
 * Purpose: Proxy authentication middleware
 * Validates token, ensures user exists, populates req.user
 */
export const proxyAuthMiddleware = async (
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
    const payload = await validateToken(token);
    
    if (!payload) {
      res.status(401).json({ 
        success: false,
        error: 'Invalid or expired token' 
      });
      return;
    }


    // Populate res.locals for internal use
    res.locals.user = {
      id: Number(payload.userId),
      email: payload.email,
      avatar: payload.avatar || '',
      name: payload.name || 'User'
    };

    res.locals.org = {
      id: payload.orgId,
      name: payload.orgName
    };

    // Map to req.user for backward compatibility with existing code
    req.user = {
      id: Number(payload.userId),
      org_id: Number(payload.orgId)
    };

    console.log(`[Proxy Auth] ✅ Authenticated user ${req.user.id} for org ${req.user.org_id}`);
    
    next();
  } catch (error) {
    console.error('[Proxy Auth] Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Authentication error' 
    });
  }
};
