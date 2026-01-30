import { Request, Response } from 'express';
import { SchemaService } from './schema.service.js';

const schemaService = new SchemaService();

export const getSchema = (_req: Request, res: Response): void => {
  try {
    const schema = schemaService.getSchema();
    res.json(schema);
  } catch (error) {
    console.error('Failed to retrieve schema:', error);
    res.status(500).json({
      error: 'Failed to retrieve database schema',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
