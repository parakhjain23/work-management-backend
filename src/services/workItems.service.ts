import { getPrismaClient } from '../db/prisma.js';
import { WorkItemStatus, WorkItemPriority, LogType } from '@prisma/client';
import { eventDispatcher, CentralizedEventDispatcher } from '../events/event.dispatcher.centralized.js';

export interface CreateWorkItemDto {
  categoryId: bigint;
  title: string;
  description?: string;
  status?: WorkItemStatus;
  priority?: WorkItemPriority;
  assigneeId?: bigint;
  startDate?: Date;
  dueDate?: Date;
  parentId?: bigint;
}

export interface UpdateWorkItemDto {
  title?: string;
  description?: string;
  status?: WorkItemStatus;
  priority?: WorkItemPriority;
  categoryId?: bigint;
}

export interface WorkItemFilters {
  categoryId?: bigint;
  status?: WorkItemStatus;
  priority?: WorkItemPriority;
  limit?: number;
  offset?: number;
}

export class WorkItemsService {
  private prisma = getPrismaClient();

  async findAll(orgId: bigint, filters: WorkItemFilters = {}) {
    const { categoryId, status, priority, limit = 50, offset = 0 } = filters;

    const where: any = {
      category: { orgId }
    };

    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    return await this.prisma.workItem.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, keyName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  async findByCategory(categoryId: bigint, orgId: bigint) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, orgId }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return await this.prisma.workItem.findMany({
      where: { categoryId },
      include: {
        category: {
          select: { id: true, name: true, keyName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(workItemId: bigint, orgId: bigint) {
    const workItem = await this.prisma.workItem.findFirst({
      where: {
        id: workItemId,
        category: { orgId }
      },
      include: {
        category: {
          select: { id: true, name: true, keyName: true }
        },
        parent: {
          select: { id: true, title: true }
        }
      }
    });

    if (!workItem) {
      throw new Error('Work item not found');
    }

    return workItem;
  }

  /**
   * Purpose: Create a new work item and emit creation event
   */
  async create(orgId: bigint, userId: bigint, data: CreateWorkItemDto) {
    const category = await this.prisma.category.findFirst({
      where: { id: data.categoryId, orgId }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    if (data.parentId) {
      const parent = await this.prisma.workItem.findFirst({
        where: {
          id: data.parentId,
          category: { orgId }
        }
      });

      if (!parent) {
        throw new Error('Parent work item not found');
      }
    }

    const workItem = await this.prisma.workItem.create({
      data: {
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        status: data.status || WorkItemStatus.CAPTURED,
        priority: data.priority,
        assigneeId: data.assigneeId,
        startDate: data.startDate,
        dueDate: data.dueDate,
        parentId: data.parentId,
        createdBy: userId,
        updatedBy: userId
      },
      include: {
        category: {
          select: { id: true, name: true, keyName: true }
        }
      }
    });

    await this.prisma.workItemLog.create({
      data: {
        workItemId: workItem.id,
        logType: LogType.field_update,
        message: 'Work item created'
      }
    });

    // Emit event after successful DB mutation
    await eventDispatcher.emit(
      CentralizedEventDispatcher.workItemEvent(
        'create',
        workItem.id,
        'user',
        ['title', 'description', 'status', 'priority'],
        data.parentId
      )
    );

    return workItem;
  }

  /**
   * Purpose: Update work item and emit update event with changed fields
   */
  async update(workItemId: bigint, orgId: bigint, userId: bigint, data: UpdateWorkItemDto) {
    const workItem = await this.findById(workItemId, orgId);

    const changes: string[] = [];
    if (data.title && data.title !== workItem.title) {
      changes.push(`Title changed from "${workItem.title}" to "${data.title}"`);
    }
    if (data.status && data.status !== workItem.status) {
      changes.push(`Status changed from ${workItem.status} to ${data.status}`);
    }
    if (data.priority && data.priority !== workItem.priority) {
      changes.push(`Priority changed from ${workItem.priority} to ${data.priority}`);
    }

    if (data.categoryId && data.categoryId !== workItem.categoryId) {
      const newCategory = await this.prisma.category.findFirst({
        where: { id: data.categoryId, orgId }
      });
      if (!newCategory) {
        throw new Error('New category not found');
      }
      changes.push(`Category changed to ${newCategory.name}`);
    }

    const updated = await this.prisma.workItem.update({
      where: { id: workItem.id },
      data: {
        ...data,
        updatedBy: userId
      },
      include: {
        category: {
          select: { id: true, name: true, keyName: true }
        }
      }
    });

    if (changes.length > 0) {
      await this.prisma.workItemLog.create({
        data: {
          workItemId: workItem.id,
          logType: LogType.field_update,
          message: changes.join('; ')
        }
      });
    }

    // Emit event after successful DB mutation
    const changedFields = Object.keys(data);
    await eventDispatcher.emit(
      CentralizedEventDispatcher.workItemEvent(
        'update',
        updated.id,
        'user',
        changedFields
      )
    );

    return updated;
  }

  /**
   * Purpose: Delete work item and emit deletion event
   */
  async delete(workItemId: bigint, orgId: bigint) {
    const workItem = await this.findById(workItemId, orgId);

    await this.prisma.workItem.delete({
      where: { id: workItem.id }
    });

    // Emit event after successful DB mutation
    await eventDispatcher.emit(
      CentralizedEventDispatcher.workItemEvent(
        'delete',
        workItemId,
        'user'
      )
    );
  }

  async findChildren(workItemId: bigint, orgId: bigint) {
    await this.findById(workItemId, orgId);

    return await this.prisma.workItem.findMany({
      where: { parentId: workItemId },
      include: {
        category: {
          select: { id: true, name: true, keyName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Purpose: Create child work item (inherits category from parent)
   * Event is emitted by create() method
   */
  async createChild(parentId: bigint, orgId: bigint, userId: bigint, data: Omit<CreateWorkItemDto, 'parentId'>) {
    const parent = await this.findById(parentId, orgId);

    const childData: CreateWorkItemDto = {
      ...data,
      categoryId: parent.categoryId,
      parentId
    };

    // create() method will emit the event with parent_id
    return await this.create(orgId, userId, childData);
  }
}
