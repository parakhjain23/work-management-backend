import { Router } from 'express';
import {
  getWorkItems,
  getWorkItemsByCategory,
  getWorkItemById,
  createWorkItem,
  updateWorkItem,
  deleteWorkItem,
  getWorkItemChildren,
  createWorkItemChild
} from '../controllers/workItems.controller.js';

const router = Router();

router.get('/work-items', getWorkItems);
router.get('/categories/:categoryId/work-items', getWorkItemsByCategory);
router.get('/work-items/:workItemId', getWorkItemById);
router.post('/work-items', createWorkItem);
router.patch('/work-items/:workItemId', updateWorkItem);
router.delete('/work-items/:workItemId', deleteWorkItem);
router.get('/work-items/:workItemId/children', getWorkItemChildren);
router.post('/work-items/:workItemId/children', createWorkItemChild);

export default router;
