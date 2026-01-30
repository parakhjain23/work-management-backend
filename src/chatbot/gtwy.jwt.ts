import jwt from 'jsonwebtoken';

export interface GtwyJwtPayload {
  org_id: string;
  chatbot_id: string;
  user_id: string;
  variables: {
    org_id: string;
    user_id: string;
    env: string;
  };
  iat: number;
  exp: number;
}

export interface GtwyTokenOptions {
  orgId: string;
  userId: string;
  chatbotId: string;
  expirySeconds: number;
  env: string;
  internalOrgId?: string;
}

export class GtwyJwtService {
  private accessKey: string;

  constructor(accessKey: string) {
    if (!accessKey) {
      throw new Error('GTWY_ACCESS_KEY is required for JWT generation');
    }
    this.accessKey = accessKey;
  }

  public generateEmbedToken(options: GtwyTokenOptions): string {
    const now = Math.floor(Date.now() / 1000);
    
    const payload: GtwyJwtPayload = {
      org_id: options.orgId,
      chatbot_id: options.chatbotId,
      user_id: options.userId,
      variables: {
        org_id: options.internalOrgId || options.orgId,
        user_id: options.userId,
        env: options.env
      },
      iat: now,
      exp: now + options.expirySeconds
    };

    const token = jwt.sign(payload, this.accessKey, {
      algorithm: 'HS256'
    });

    return token;
  }

  public verifyToken(token: string): GtwyJwtPayload {
    try {
      const decoded = jwt.verify(token, this.accessKey, {
        algorithms: ['HS256']
      }) as GtwyJwtPayload;
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}
