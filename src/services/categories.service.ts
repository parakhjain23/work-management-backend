import { getPrismaClient } from '../db/prisma.js';
import { eventDispatcher, CentralizedEventDispatcher } from '../events/event.dispatcher.centralized.js';

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
      orderBy: { name: 'asc' }
    });
  }

  async findById(categoryId: bigint, orgId: bigint) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        orgId
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
    const existing = await this.prisma.category.findFirst({
      where: {
        orgId,
        keyName: data.keyName
      }
    });

    if (existing) {
      throw new Error('Category with this key_name already exists');
    }

    const category = await this.prisma.category.create({
      data: {
        orgId,
        keyName: data.keyName,
        name: data.name,
        externalTool: data.externalTool,
        createdBy: userId,
        updatedBy: userId
      }
    });

    // Emit event after successful DB mutation
    await eventDispatcher.emit(
      CentralizedEventDispatcher.categoryEvent(
        'create',
        category.id,
        'user',
        ['name', 'key_name']
      )
    );

    return category;
  }

  /**
   * Purpose: Update category and emit update event with changed fields
   */
  async update(categoryId: bigint, orgId: bigint, userId: bigint, data: UpdateCategoryDto) {
    const category = await this.findById(categoryId, orgId);

    const updated = await this.prisma.category.update({
      where: { id: category.id },
      data: {
        ...data,
        updatedBy: userId
      }
    });

    // Emit event after successful DB mutation
    const changedFields = Object.keys(data);
    await eventDispatcher.emit(
      CentralizedEventDispatcher.categoryEvent(
        'update',
        updated.id,
        'user',
        changedFields
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

    // Emit event after successful DB mutation
    await eventDispatcher.emit(
      CentralizedEventDispatcher.categoryEvent(
        'delete',
        categoryId,
        'user'
      )
    );
  }
}
