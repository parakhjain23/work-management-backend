import { Request, Response } from 'express';
import { GtwyJwtService } from './gtwy.jwt.js';

const GTWY_ACCESS_KEY = process.env.GTWY_ACCESS_KEY || '';
const GTWY_CHATBOT_ID = '69803b8067da81ed84b2aa69';
const GTWY_ORG_ID = '59162';
const JWT_EXPIRY_SECONDS = parseInt(process.env.JWT_EXPIRY_SECONDS || '3600', 10);
const NODE_ENV = process.env.NODE_ENV || 'local';

let jwtService: GtwyJwtService | null = null;

try {
  jwtService = new GtwyJwtService(GTWY_ACCESS_KEY);
} catch (error) {
  console.error('❌ Failed to initialize GTWY JWT Service:', error);
}

export const getEmbedToken = (req: Request, res: Response): void => {
  try {
    if (!req.user || !req.user.id || !req.user.org_id) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!jwtService) {
      console.error('GTWY JWT Service not initialized - check GTWY_ACCESS_KEY');
      res.status(500).json({
        success: false,
        error: 'Chatbot token generation failed'
      });
      return;
    }

    if (!GTWY_CHATBOT_ID) {
      console.error('GTWY_CHATBOT_ID not configured');
      res.status(500).json({
        success: false,
        error: 'Chatbot token generation failed'
      });
      return;
    }

    const embedToken = jwtService.generateEmbedToken({
      orgId: GTWY_ORG_ID,
      userId: req.user.id.toString(),
      chatbotId: GTWY_CHATBOT_ID,
      expirySeconds: JWT_EXPIRY_SECONDS,
      env: NODE_ENV,
      internalOrgId: req.user.org_id.toString()
    });

    res.json({
      success: true,
      embedToken,
      expiresIn: JWT_EXPIRY_SECONDS
    });

  } catch (error) {
    console.error('Embed token generation error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({
      success: false,
      error: 'Chatbot token generation failed'
    });
  }
};
