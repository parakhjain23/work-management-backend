import { getPrismaClient } from '../db/prisma.js';
import { DataType, LogType } from '@prisma/client';
import { eventDispatcher, CentralizedEventDispatcher } from '../events/event.dispatcher.centralized.js';

export interface CreateCustomFieldMetaDto {
  name: string;
  keyName: string;
  dataType: DataType;
  description?: string;
  enums?: string;
  meta?: any;
}

export interface UpdateCustomFieldMetaDto {
  name?: string;
  description?: string;
  enums?: string;
  meta?: any;
}

export interface UpdateCustomFieldValuesDto {
  [keyName: string]: any;
}

export class CustomFieldsService {
  private prisma = getPrismaClient();

  async findMetaByCategory(categoryId: bigint, orgId: bigint) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, orgId }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return await this.prisma.customFieldMetaData.findMany({
      where: { categoryId },
      orderBy: { name: 'asc' }
    });
  }

  async findMetaById(fieldId: bigint, orgId: bigint) {
    const field = await this.prisma.customFieldMetaData.findFirst({
      where: { id: fieldId, orgId }
    });

    if (!field) {
      throw new Error('Custom field not found');
    }

    return field;
  }

  /**
   * Purpose: Create custom field metadata and emit creation event
   */
  async createMeta(categoryId: bigint, orgId: bigint, userId: bigint, data: CreateCustomFieldMetaDto) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, orgId }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    const existing = await this.prisma.customFieldMetaData.findFirst({
      where: { orgId, keyName: data.keyName }
    });

    if (existing) {
      throw new Error('Custom field with this key_name already exists');
    }

    const field = await this.prisma.customFieldMetaData.create({
      data: {
        orgId,
        categoryId,
        name: data.name,
        keyName: data.keyName,
        dataType: data.dataType,
        description: data.description,
        enums: data.enums,
        meta: data.meta,
        createdBy: userId,
        updatedBy: userId
      }
    });

    // Emit event after successful DB mutation
    await eventDispatcher.emit(
      CentralizedEventDispatcher.customFieldEvent(
        'create',
        field.id,
        'user',
        ['name', 'key_name', 'data_type']
      )
    );

    return field;
  }

  /**
   * Purpose: Update custom field metadata and emit update event with changed fields
   */
  async updateMeta(fieldId: bigint, orgId: bigint, userId: bigint, data: UpdateCustomFieldMetaDto) {
    const field = await this.findMetaById(fieldId, orgId);

    const updated = await this.prisma.customFieldMetaData.update({
      where: { id: field.id },
      data: {
        ...data,
        updatedBy: userId
      }
    });

    // Emit event after successful DB mutation
    const changedFields = Object.keys(data);
    await eventDispatcher.emit(
      CentralizedEventDispatcher.customFieldEvent(
        'update',
        updated.id,
        'user',
        changedFields
      )
    );

    return updated;
  }

  /**
   * Purpose: Delete custom field metadata and emit deletion event
   */
  async deleteMeta(fieldId: bigint, orgId: bigint) {
    const field = await this.findMetaById(fieldId, orgId);

    await this.prisma.customFieldMetaData.delete({
      where: { id: field.id }
    });

    // Emit event after successful DB mutation
    await eventDispatcher.emit(
      CentralizedEventDispatcher.customFieldEvent(
        'delete',
        fieldId,
        'user'
      )
    );
  }

  async findValuesByWorkItem(workItemId: bigint, orgId: bigint) {
    const workItem = await this.prisma.workItem.findFirst({
      where: {
        id: workItemId,
        category: { orgId }
      }
    });

    if (!workItem) {
      throw new Error('Work item not found');
    }

    const values = await this.prisma.customFieldValue.findMany({
      where: { workItemId },
      include: {
        customFieldMetaData: {
          select: {
            id: true,
            name: true,
            keyName: true,
            dataType: true,
            description: true,
            enums: true,
            meta: true
          }
        }
      }
    });

    const result: any = {};
    for (const value of values) {
      const keyName = value.customFieldMetaData.keyName;
      switch (value.customFieldMetaData.dataType) {
        case DataType.number:
          result[keyName] = value.valueNumber ? Number(value.valueNumber) : null;
          break;
        case DataType.text:
          result[keyName] = value.valueText;
          break;
        case DataType.boolean:
          result[keyName] = value.valueBoolean;
          break;
        case DataType.json:
          result[keyName] = value.valueJson;
          break;
      }
    }

    return result;
  }

  /**
   * Purpose: Update custom field values (UPSERT) and emit single update event
   * Emits ONE event per API call, not per field
   */
  async updateValues(workItemId: bigint, orgId: bigint, data: UpdateCustomFieldValuesDto) {
    const workItem = await this.prisma.workItem.findFirst({
      where: {
        id: workItemId,
        category: { orgId }
      }
    });

    if (!workItem) {
      throw new Error('Work item not found');
    }

    const allFields = await this.prisma.customFieldMetaData.findMany({
      where: { orgId }
    });

    const fieldMap = new Map(allFields.map(f => [f.keyName, f]));
    const changes: string[] = [];

    for (const [keyName, value] of Object.entries(data)) {
      const field = fieldMap.get(keyName);
      if (!field) {
        throw new Error(`Custom field "${keyName}" not found`);
      }

      const valueData: any = {
        workItemId,
        customFieldMetaDataId: field.id
      };

      switch (field.dataType) {
        case DataType.number:
          if (typeof value !== 'number') {
            throw new Error(`Field "${keyName}" expects a number`);
          }
          valueData.valueNumber = value;
          break;
        case DataType.text:
          if (typeof value !== 'string') {
            throw new Error(`Field "${keyName}" expects a string`);
          }
          valueData.valueText = value;
          break;
        case DataType.boolean:
          if (typeof value !== 'boolean') {
            throw new Error(`Field "${keyName}" expects a boolean`);
          }
          valueData.valueBoolean = value;
          break;
        case DataType.json:
          valueData.valueJson = value;
          break;
      }

      await this.prisma.customFieldValue.upsert({
        where: {
          workItemId_customFieldMetaDataId: {
            workItemId,
            customFieldMetaDataId: field.id
          }
        },
        create: valueData,
        update: valueData
      });

      changes.push(`${field.name} updated to ${value}`);
    }

    if (changes.length > 0) {
      await this.prisma.workItemLog.create({
        data: {
          workItemId,
          logType: LogType.field_update,
          message: `Custom fields updated: ${changes.join(', ')}`
        }
      });
    }

    // Emit ONE event after all DB mutations complete
    const changedFields = Object.keys(data);
    await eventDispatcher.emit(
      CentralizedEventDispatcher.customFieldValueEvent(
        'update',
        workItemId,
        'user',
        changedFields
      )
    );

    return await this.findValuesByWorkItem(workItemId, orgId);
  }
}
