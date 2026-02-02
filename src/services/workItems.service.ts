import { getPrismaClient } from '../db/prisma.js';
import { WorkItemStatus, WorkItemPriority, LogType } from '@prisma/client';
import { domainEventDispatcher, DomainEventDispatcher } from '../events/domain.event.dispatcher.js';
import { WorkItemFullData } from '../types/workItem.types.js';
import { FieldChange } from '../types/events.types.js';

export interface CreateWorkItemDto {
  title: string;
  categoryId?: bigint | null;
  description?: string;
  status?: WorkItemStatus;
  priority?: WorkItemPriority;
  assigneeId?: bigint;
  startDate?: Date;
  dueDate?: Date;
  parentId?: bigint;
  rootParentId?: bigint;
  externalId?: string;
  createdBy?: bigint;
}

export interface UpdateWorkItemDto {
  title?: string;
  description?: string;
  status?: WorkItemStatus;
  priority?: WorkItemPriority;
  categoryId?: bigint;
  assigneeId?: bigint | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  externalId?: string | null;
  createdBy?: bigint | null;
  parentId?: bigint | null;
  rootParentId?: bigint | null;
  docId?: string | null;
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
      OR: [
        { category: { orgId } },
        { categoryId: null }
      ]
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
        OR: [
          { category: { orgId } },
          { categoryId: null as any }
        ]
      } as any,
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
    // Validate category if provided
    if (data.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: data.categoryId, orgId }
      });
      if (!category) {
        throw new Error('Category not found');
      }
    }

    // Validate parent if provided
    if (data.parentId) {
      const parent = await this.prisma.workItem.findFirst({
        where: { id: data.parentId }
      });
      if (!parent) {
        throw new Error('Parent work item not found');
      }
    }

    // Validate root parent if provided
    if (data.rootParentId) {
      const rootParent = await this.prisma.workItem.findFirst({
        where: { id: data.rootParentId }
      });
      if (!rootParent) {
        throw new Error('Root parent work item not found');
      }
    }

    const workItem = await this.prisma.workItem.create({
      data: {
        categoryId: data.categoryId ?? undefined,
        title: data.title,
        description: data.description,
        status: data.status || WorkItemStatus.CAPTURED,
        priority: data.priority,
        assigneeId: data.assigneeId,
        startDate: data.startDate,
        dueDate: data.dueDate,
        parentId: data.parentId,
        rootParentId: data.rootParentId,
        externalId: data.externalId,
        createdBy: userId,
        updatedBy: userId
      } as any,
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

    // Emit domain event after successful DB mutation
    const fieldChanges: Record<string, FieldChange> = {
      title: { oldValue: null, newValue: workItem.title, fieldType: 'standard_field' },
      status: { oldValue: null, newValue: workItem.status, fieldType: 'standard_field' }
    };
    if (workItem.description) fieldChanges.description = { oldValue: null, newValue: workItem.description, fieldType: 'standard_field' };
    if (workItem.priority) fieldChanges.priority = { oldValue: null, newValue: workItem.priority, fieldType: 'standard_field' };
    if (workItem.categoryId) fieldChanges.categoryId = { oldValue: null, newValue: workItem.categoryId.toString(), fieldType: 'standard_field' };

    await domainEventDispatcher.emit(
      DomainEventDispatcher.workItemEvent(
        'create',
        workItem.id,
        orgId,
        workItem.categoryId,
        'user',
        Object.keys(fieldChanges),
        fieldChanges
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

    if (data.parentId !== undefined && data.parentId !== null) {
      const parentWorkItem = await this.prisma.workItem.findFirst({
        where: {
          id: data.parentId,
          OR: [
            { category: { orgId } },
            { categoryId: null }
          ]
        } as any
      });
      if (!parentWorkItem) {
        throw new Error('Parent work item not found');
      }
      changes.push(`Parent changed to work item #${data.parentId}`);
    }

    // Filter out undefined values and track field changes
    const updateData: any = { updatedBy: userId };
    const fieldChanges: Record<string, FieldChange> = {};
    const changedFields: string[] = [];

    Object.keys(data).forEach(key => {
      const value = data[key as keyof UpdateWorkItemDto];
      if (value !== undefined) {
        const oldValue = (workItem as any)[key];
        const newValue = value;
        
        // Only track if value actually changed
        if (oldValue !== newValue) {
          updateData[key] = value;
          changedFields.push(key);
          fieldChanges[key] = {
            oldValue: oldValue instanceof Date ? oldValue.toISOString() : oldValue?.toString() || null,
            newValue: newValue instanceof Date ? newValue.toISOString() : newValue?.toString() || null,
            fieldType: 'standard_field'
          };
        }
      }
    });

    const updated = await this.prisma.workItem.update({
      where: { id: workItem.id },
      data: updateData,
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

    // Emit domain event after successful DB mutation
    await domainEventDispatcher.emit(
      DomainEventDispatcher.workItemEvent(
        'update',
        updated.id,
        orgId,
        updated.categoryId,
        'user',
        changedFields,
        fieldChanges
      )
    );

    return updated;
  }

  /**
   * Purpose: Delete work item and emit deletion event
   * Deletes related logs and custom field values first (cascade)
   */
  async delete(workItemId: bigint, orgId: bigint) {
    const workItem = await this.findById(workItemId, orgId);

    // Delete related records first (cascade)
    await this.prisma.workItemLog.deleteMany({
      where: { workItemId: workItem.id }
    });

    await this.prisma.customFieldValue.deleteMany({
      where: { workItemId: workItem.id }
    });

    // Now delete the work item
    await this.prisma.workItem.delete({
      where: { id: workItem.id }
    });

    // Emit domain event after successful DB mutation
    const fieldChanges: Record<string, FieldChange> = {
      title: { oldValue: workItem.title, newValue: null, fieldType: 'standard_field' },
      status: { oldValue: workItem.status, newValue: null, fieldType: 'standard_field' }
    };

    await domainEventDispatcher.emit(
      DomainEventDispatcher.workItemEvent(
        'delete',
        workItemId,
        orgId,
        workItem.categoryId,
        'user',
        ['title', 'status', 'deleted'],
        fieldChanges
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

  /**
   * Purpose: Fetch complete work item data including category and custom fields
   * Returns the same structure that workers use for condition evaluation
   */
  async getFullData(workItemId: bigint, orgId: bigint): Promise<WorkItemFullData> {
    // Query 1: Fetch work item with category
    const workItem = await this.prisma.workItem.findFirst({
      where: {
        id: workItemId,
        OR: [
          { category: { orgId } },
          { categoryId: null }
        ]
      } as any,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            keyName: true,
            externalTool: true
          }
        }
      }
    });

    if (!workItem) {
      throw new Error('Work item not found');
    }

    // Query 2: Fetch all custom field metadata for this category (if category exists)
    const customFieldsMetadata = workItem.categoryId
      ? await this.prisma.customFieldMetaData.findMany({
        where: {
          categoryId: workItem.categoryId
        },
        select: {
          id: true,
          keyName: true,
          name: true,
          dataType: true,
          description: true,
          enums: true,
          meta: true
        },
        orderBy: { name: 'asc' }
      })
      : [];

    // Query 3: Fetch custom field values for this work item
    const customFieldValues = await this.prisma.customFieldValue.findMany({
      where: {
        workItemId: workItemId
      },
      include: {
        customFieldMetaData: {
          select: {
            keyName: true,
            dataType: true
          }
        }
      }
    });

    // Map custom field values by keyName
    const customFields: Record<string, any> = {};

    for (const cfValue of customFieldValues) {
      const keyName = cfValue.customFieldMetaData.keyName;

      // Extract value based on data type
      let value: any = null;
      if (cfValue.valueText !== null) value = cfValue.valueText;
      else if (cfValue.valueNumber !== null) value = Number(cfValue.valueNumber);
      else if (cfValue.valueBoolean !== null) value = cfValue.valueBoolean;
      else if (cfValue.valueJson !== null) value = cfValue.valueJson;

      customFields[keyName] = value;
    }

    // Return complete data structure
    return {
      id: workItem.id.toString(),
      title: workItem.title,
      description: workItem.description,
      status: workItem.status,
      priority: workItem.priority || '',
      categoryId: workItem.categoryId?.toString() || null,
      assigneeId: workItem.assigneeId?.toString() || null,
      createdBy: workItem.createdBy?.toString() || '',
      updatedBy: workItem.updatedBy?.toString() || '',
      startDate: workItem.startDate?.toISOString() || null,
      dueDate: workItem.dueDate?.toISOString() || null,
      parentId: workItem.parentId?.toString() || null,
      rootParentId: workItem.rootParentId?.toString() || null,
      externalId: workItem.externalId,
      docId: workItem.docId,
      createdAt: workItem.createdAt.toISOString(),
      updatedAt: workItem.updatedAt.toISOString(),
      category: workItem.category ? {
        id: workItem.category.id.toString(),
        name: workItem.category.name,
        keyName: workItem.category.keyName,
        externalTool: workItem.category.externalTool
      } : null,
      customFieldsMetadata: customFieldsMetadata.map(cf => ({
        id: cf.id.toString(),
        keyName: cf.keyName,
        name: cf.name,
        dataType: cf.dataType,
        description: cf.description,
        enums: cf.enums,
        meta: cf.meta
      })),
      customFields
    };
  }
}
