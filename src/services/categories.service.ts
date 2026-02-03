import { getPrismaClient } from '../db/prisma.js';
import { domainEventDispatcher, DomainEventDispatcher } from '../events/domain.event.dispatcher.js';
import { FieldChange } from '../types/events.types.js';

export interface CreateCategoryDto {
  keyName: string;
  name: string;
  externalTool?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  externalTool?: string;
}

export class CategoriesService {
  private prisma = getPrismaClient();

  async findAll(orgId: bigint) {
    return await this.prisma.category.findMany({
      where: { orgId },
      include: {
        customFieldMetaData: true
      },
      orderBy: { name: 'asc' }
    });
  }

  async findById(categoryId: bigint, orgId: bigint) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        orgId
      },
      include: {
        customFieldMetaData: true
      }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return category;
  }

  /**
   * Purpose: Create a new category and emit creation event
   */
  async create(orgId: bigint, userId: bigint, data: CreateCategoryDto) {
    const normalizedKeyName = data.keyName.toLowerCase();

    const existing = await this.prisma.category.findFirst({
      where: {
        AND: [
          { orgId },
          { keyName: normalizedKeyName }
        ]
      }
    });

    if (existing) {
      throw new Error('Category with this key_name already exists');
    }

    const category = await this.prisma.category.create({
      data: {
        orgId,
        keyName: normalizedKeyName,
        name: data.name,
        externalTool: data.externalTool,
        createdBy: userId,
        updatedBy: userId
      }
    });

    // Emit domain event after successful DB mutation
    const fieldChanges: Record<string, FieldChange> = {
      name: { oldValue: null, newValue: category.name, fieldType: 'standard_field' },
      keyName: { oldValue: null, newValue: category.keyName, fieldType: 'standard_field' }
    };
    if (category.externalTool) {
      fieldChanges.externalTool = { oldValue: null, newValue: category.externalTool, fieldType: 'standard_field' };
    }

    await domainEventDispatcher.emit(
      DomainEventDispatcher.categoryEvent(
        'create',
        category.id,
        orgId,
        'user',
        Object.keys(fieldChanges),
        fieldChanges
      )
    );

    return category;
  }

  /**
   * Purpose: Update category and emit update event with changed fields
   */
  async update(categoryId: bigint, orgId: bigint, userId: bigint, data: UpdateCategoryDto) {
    const category = await this.findById(categoryId, orgId);

    // Track field changes
    const fieldChanges: Record<string, FieldChange> = {};
    const changedFields: string[] = [];

    Object.keys(data).forEach(key => {
      const value = data[key as keyof UpdateCategoryDto];
      if (value !== undefined) {
        const oldValue = (category as any)[key];
        if (oldValue !== value) {
          changedFields.push(key);
          fieldChanges[key] = {
            oldValue: oldValue?.toString() || null,
            newValue: value?.toString() || null,
            fieldType: 'standard_field'
          };
        }
      }
    });

    const updated = await this.prisma.category.update({
      where: { id: category.id },
      data: {
        ...data,
        updatedBy: userId
      }
    });

    // Emit domain event after successful DB mutation
    await domainEventDispatcher.emit(
      DomainEventDispatcher.categoryEvent(
        'update',
        updated.id,
        orgId,
        'user',
        changedFields,
        fieldChanges
      )
    );

    return updated;
  }

  /**
   * Purpose: Delete category and emit deletion event
   */
  async delete(categoryId: bigint, orgId: bigint) {
    const category = await this.findById(categoryId, orgId);

    const workItemCount = await this.prisma.workItem.count({
      where: { categoryId: category.id }
    });

    if (workItemCount > 0) {
      throw new Error('Cannot delete category with existing work items');
    }

    await this.prisma.category.delete({
      where: { id: category.id }
    });

    // Emit domain event after successful DB mutation
    const fieldChanges: Record<string, FieldChange> = {
      name: { oldValue: category.name, newValue: null, fieldType: 'standard_field' },
      keyName: { oldValue: category.keyName, newValue: null, fieldType: 'standard_field' }
    };

    await domainEventDispatcher.emit(
      DomainEventDispatcher.categoryEvent(
        'delete',
        categoryId,
        orgId,
        'user',
        ['name', 'keyName', 'deleted'],
        fieldChanges
      )
    );
  }
}
