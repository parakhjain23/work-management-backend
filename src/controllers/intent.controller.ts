import { Request, Response } from 'express';
import { IntentRouter } from '../ai/intent.router.js';
import { IntentRequest } from '../ai/intent.types.js';
import { serializeBigInt } from '../utils/bigint.serializer.js';

const intentRouter = new IntentRouter();

/**
 * AI Intent API - Single entrypoint for all AI mutations
 * AI never calls CRUD APIs directly
 * AI never generates mutation SQL
 */
export const executeIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { intent, payload, threadId } = req.body as IntentRequest;

    // Validate request
    if (!intent) {
      res.status(400).json({
        success: false,
        error: 'intent is required'
      });
      return;
    }

    if (!payload) {
      res.status(400).json({
        success: false,
        error: 'payload is required'
      });
      return;
    }

    if (!threadId) {
      res.status(400).json({
        success: false,
        error: 'threadId is required'
      });
      return;
    }

    // Get user context
    const orgId = BigInt(req.user!.org_id);
    const userId = BigInt(req.user!.id);

    console.log(`[Intent API] Processing intent: ${intent} for org: ${orgId}, thread: ${threadId}`);

    // Route intent
    const result = await intentRouter.route(
      { intent, payload, threadId },
      orgId,
      userId
    );

    // Return response (serialize BigInt values to strings)
    const serializedResult = serializeBigInt(result);
    
    if (result.success) {
      res.json(serializedResult);
    } else {
      const statusCode = result.error?.includes('Scope violation') ? 403 : 400;
      res.status(statusCode).json(serializedResult);
    }
  } catch (error) {
    console.error('[Intent API] Error:', error);
    
    // Check for specific error types
    let statusCode = 500;
    let errorMessage = 'Intent execution failed';

    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (errorMessage.includes('not found')) {
        statusCode = 404;
      } else if (errorMessage.includes('already exists')) {
        statusCode = 409;
      } else if (errorMessage.includes('required')) {
        statusCode = 400;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
};
