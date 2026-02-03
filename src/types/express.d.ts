import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        org_id: number;
        email: string;
        avatar: string;
        name: string;
        org_name: string;
      };
    }
  }
}
