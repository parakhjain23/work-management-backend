import { getPrismaClient } from '../db/prisma.js';
import { DataType, LogType } from '@prisma/client';
import { domainEventDispatcher, DomainEventDispatcher } from '../events/domain.event.dispatcher.js';
import { FieldChange } from '../types/events.types.js';

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

export interface CreateFromExistingDto {
  sourceFieldId: bigint;
  name?: string;
  keyName?: string;
  description?: string;
}

export class CustomFieldsService {
  private prisma = getPrismaClient();

  /**
   * Purpose: Get all custom fields across all categories for an organization
   * Used for browsing and selecting existing custom fields to reuse
   */
  async findAllMeta(orgId: bigint) {
    return await this.prisma.customFieldMetaData.findMany({
      where: { orgId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            keyName: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

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

    const normalizedKeyName = data.keyName.toLowerCase();

    const existing = await this.prisma.customFieldMetaData.findFirst({
      where: { categoryId, keyName: normalizedKeyName }
    });

    if (existing) {
      throw new Error('Custom field with this key_name already exists in this category');
    }

    const field = await this.prisma.customFieldMetaData.create({
      data: {
        orgId,
        categoryId,
        name: data.name,
        keyName: normalizedKeyName,
        dataType: data.dataType,
        description: data.description,
        enums: data.enums,
        meta: data.meta,
        createdBy: userId,
        updatedBy: userId
      }
    });

    // Note: Custom field metadata operations don't emit domain events
    
    return field;
  }

  /**
   * Purpose: Create custom field by copying from existing field
   * Allows reusing custom field definitions across categories
   */
  async createMetaFromExisting(categoryId: bigint, orgId: bigint, userId: bigint, data: CreateFromExistingDto) {
    // Verify target category exists
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, orgId }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // Get source custom field
    const sourceField = await this.prisma.customFieldMetaData.findFirst({
      where: { id: data.sourceFieldId, orgId }
    });

    if (!sourceField) {
      throw new Error('Source custom field not found');
    }

    // Use provided values or copy from source
    const name = data.name || sourceField.name;
    const keyName = (data.keyName || sourceField.keyName).toLowerCase();
    const description = data.description || sourceField.description;

    // Check if keyName already exists in this category
    const existing = await this.prisma.customFieldMetaData.findFirst({
      where: { categoryId, keyName }
    });

    if (existing) {
      throw new Error('Custom field with this key_name already exists in this category');
    }

    // Create new custom field with copied definition
    const field = await this.prisma.customFieldMetaData.create({
      data: {
        orgId,
        categoryId,
        name,
        keyName,
        dataType: sourceField.dataType,
        description,
        enums: sourceField.enums,
        meta: sourceField.meta as any,
        createdBy: userId,
        updatedBy: userId
      }
    });

    // Note: Custom field metadata operations don't emit domain events
    
    return field;
  }

  /**
   * Purpose: Update custom field metadata with changed fields
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

    // Note: Custom field metadata operations don't emit domain events
    
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

    // Note: Custom field metadata operations don't emit domain events
  }

  async findValuesByWorkItem(workItemId: bigint, orgId: bigint) {
    const workItem = await this.prisma.workItem.findFirst({
      where: {
        id: workItemId,
        OR: [
          { category: { orgId } },
          { categoryId: null }
        ]
      } as any,
      include: {
        category: true
      }
    });

    if (!workItem) {
      throw new Error('Work item not found');
    }

    // Get all custom fields defined for this work item's category (if it has one)
    const categoryFields = workItem.categoryId
      ? await this.prisma.customFieldMetaData.findMany({
          where: { categoryId: workItem.categoryId },
          orderBy: { name: 'asc' }
        })
      : [];

    // Get existing values for this work item
    const existingValues = await this.prisma.customFieldValue.findMany({
      where: { workItemId },
      include: {
        customFieldMetaData: true
      }
    });

    // Create a map of existing values by customFieldMetaDataId
    const valueMap = new Map();
    for (const value of existingValues) {
      valueMap.set(value.customFieldMetaDataId.toString(), value);
    }

    // Build result array with all category fields
    const result = categoryFields.map(field => {
      const existingValue = valueMap.get(field.id.toString());
      
      let value = null;
      if (existingValue) {
        switch (field.dataType) {
          case DataType.number:
            value = existingValue.valueNumber ? Number(existingValue.valueNumber) : null;
            break;
          case DataType.text:
            value = existingValue.valueText;
            break;
          case DataType.boolean:
            value = existingValue.valueBoolean;
            break;
          case DataType.json:
            value = existingValue.valueJson;
            break;
        }
      }

      return {
        id: existingValue?.id || null,
        workItemId: workItemId,
        customFieldMetaDataId: field.id,
        value: value,
        customFieldMetaData: {
          id: field.id,
          name: field.name,
          keyName: field.keyName,
          dataType: field.dataType,
          description: field.description,
          enums: field.enums,
          meta: field.meta
        }
      };
    });

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
        OR: [
          { category: { orgId } },
          { categoryId: null }
        ]
      } as any
    });

    if (!workItem) {
      throw new Error('Work item not found');
    }

    // Fetch custom fields only for this work item's category
    const allFields = workItem.categoryId 
      ? await this.prisma.customFieldMetaData.findMany({
          where: { 
            categoryId: workItem.categoryId,
            orgId 
          }
        })
      : [];

    if (allFields.length === 0 && Object.keys(data).length > 0) {
      throw new Error('Work item has no category or category has no custom fields');
    }

    const fieldMap = new Map(allFields.map(f => [f.keyName, f]));
    const changes: string[] = [];
    const fieldChanges: Record<string, FieldChange> = {};

    // Get existing values for change tracking
    const existingValues = await this.prisma.customFieldValue.findMany({
      where: { workItemId }
    });
    const existingValueMap = new Map(existingValues.map(v => [v.customFieldMetaDataId.toString(), v]));

    for (const [keyName, value] of Object.entries(data)) {
      const field = fieldMap.get(keyName);
      if (!field) {
        throw new Error(`Custom field "${keyName}" not found`);
      }

      const valueData: any = {
        workItemId,
        customFieldMetaDataId: field.id
      };

      // Validate enum values if field has enums defined
      if (field.enums) {
        const allowedValues = field.enums.split(',').map(v => v.trim());
        const valueStr = String(value);
        
        if (!allowedValues.includes(valueStr)) {
          throw new Error(`Invalid value for field "${keyName}". Allowed values: ${field.enums}`);
        }
      }

      // Get old value for change tracking
      const existingValue = existingValueMap.get(field.id.toString());
      let oldValue: any = null;
      if (existingValue) {
        if (existingValue.valueText !== null) oldValue = existingValue.valueText;
        else if (existingValue.valueNumber !== null) oldValue = Number(existingValue.valueNumber);
        else if (existingValue.valueBoolean !== null) oldValue = existingValue.valueBoolean;
        else if (existingValue.valueJson !== null) oldValue = existingValue.valueJson;
      }

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
      
      // Track field change
      fieldChanges[keyName] = {
        oldValue,
        newValue: value,
        fieldType: 'custom_field'
      };
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

    // Emit domain event after all DB mutations complete
    const changedFields = Object.keys(data);
    await domainEventDispatcher.emit(
      DomainEventDispatcher.customFieldValueEvent(
        'update',
        workItemId, // Use workItemId as entity_id for custom field values
        workItemId,
        orgId,
        workItem.categoryId,
        'user',
        changedFields,
        fieldChanges
      )
    );

    return await this.findValuesByWorkItem(workItemId, orgId);
  }

  /**
   * Purpose: Get a single custom field value by fieldId and workItemId
   */
  async getValueByFieldId(workItemId: bigint, fieldId: bigint, orgId: bigint) {
    // Verify work item exists and belongs to org
    const workItem = await this.prisma.workItem.findFirst({
      where: {
        id: workItemId,
        OR: [
          { category: { orgId } },
          { categoryId: null }
        ]
      } as any
    });

    if (!workItem) {
      throw new Error('Work item not found');
    }

    // Verify field exists and belongs to org
    const field = await this.prisma.customFieldMetaData.findFirst({
      where: {
        id: fieldId,
        orgId
      }
    });

    if (!field) {
      throw new Error('Custom field not found');
    }

    // Get the value
    const value = await this.prisma.customFieldValue.findUnique({
      where: {
        workItemId_customFieldMetaDataId: {
          workItemId,
          customFieldMetaDataId: fieldId
        }
      },
      include: {
        customFieldMetaData: true
      }
    });

    if (!value) {
      return {
        workItemId,
        customFieldMetaDataId: fieldId,
        value: null,
        customFieldMetaData: field
      };
    }

    // Extract value based on data type
    let extractedValue: any = null;
    if (value.valueText !== null) extractedValue = value.valueText;
    else if (value.valueNumber !== null) extractedValue = Number(value.valueNumber);
    else if (value.valueBoolean !== null) extractedValue = value.valueBoolean;
    else if (value.valueJson !== null) extractedValue = value.valueJson;

    return {
      id: value.id,
      workItemId: value.workItemId,
      customFieldMetaDataId: value.customFieldMetaDataId,
      value: extractedValue,
      customFieldMetaData: value.customFieldMetaData
    };
  }

  /**
   * Purpose: Set/update a single custom field value by fieldId and workItemId
   */
  async setValueByFieldId(workItemId: bigint, fieldId: bigint, value: any, orgId: bigint) {
    // Verify work item exists and belongs to org
    const workItem = await this.prisma.workItem.findFirst({
      where: {
        id: workItemId,
        OR: [
          { category: { orgId } },
          { categoryId: null }
        ]
      } as any
    });

    if (!workItem) {
      throw new Error('Work item not found');
    }

    // Verify field exists and belongs to org
    const field = await this.prisma.customFieldMetaData.findFirst({
      where: {
        id: fieldId,
        orgId
      }
    });

    if (!field) {
      throw new Error('Custom field not found');
    }

    // Get old value for change tracking
    const oldValueRecord = await this.prisma.customFieldValue.findUnique({
      where: {
        workItemId_customFieldMetaDataId: {
          workItemId,
          customFieldMetaDataId: fieldId
        }
      }
    });

    let oldValue: any = null;
    if (oldValueRecord) {
      if (oldValueRecord.valueText !== null) oldValue = oldValueRecord.valueText;
      else if (oldValueRecord.valueNumber !== null) oldValue = Number(oldValueRecord.valueNumber);
      else if (oldValueRecord.valueBoolean !== null) oldValue = oldValueRecord.valueBoolean;
      else if (oldValueRecord.valueJson !== null) oldValue = oldValueRecord.valueJson;
    }

    // Validate enum values if field has enums defined
    if (field.enums) {
      const allowedValues = field.enums.split(',').map(v => v.trim());
      const valueStr = String(value);
      
      if (!allowedValues.includes(valueStr)) {
        throw new Error(`Invalid value for field "${field.name}". Allowed values: ${field.enums}`);
      }
    }

    // Prepare value data based on field data type
    const valueData: any = {
      workItemId,
      customFieldMetaDataId: fieldId,
      valueText: null,
      valueNumber: null,
      valueBoolean: null,
      valueJson: null
    };

    switch (field.dataType) {
      case DataType.number:
        if (typeof value !== 'number') {
          throw new Error(`Field "${field.name}" expects a number`);
        }
        valueData.valueNumber = value;
        break;
      case DataType.text:
        if (typeof value !== 'string') {
          throw new Error(`Field "${field.name}" expects a string`);
        }
        valueData.valueText = value;
        break;
      case DataType.boolean:
        if (typeof value !== 'boolean') {
          throw new Error(`Field "${field.name}" expects a boolean`);
        }
        valueData.valueBoolean = value;
        break;
      case DataType.json:
        valueData.valueJson = value;
        break;
    }

    // Upsert the value
    const updated = await this.prisma.customFieldValue.upsert({
      where: {
        workItemId_customFieldMetaDataId: {
          workItemId,
          customFieldMetaDataId: fieldId
        }
      },
      create: valueData,
      update: valueData,
      include: {
        customFieldMetaData: true
      }
    });

    // Log the change
    await this.prisma.workItemLog.create({
      data: {
        workItemId,
        logType: LogType.field_update,
        message: `Custom field "${field.name}" updated from ${oldValue} to ${value}`
      }
    });

    // Emit domain event with change tracking
    const fieldChanges: Record<string, FieldChange> = {
      [field.keyName]: {
        oldValue,
        newValue: value,
        fieldType: 'custom_field'
      }
    };

    await domainEventDispatcher.emit(
      DomainEventDispatcher.customFieldValueEvent(
        'update',
        updated.id,
        workItemId,
        orgId,
        workItem.categoryId,
        'user',
        [field.keyName],
        fieldChanges
      )
    );

    // Extract and return value
    let extractedValue: any = null;
    if (updated.valueText !== null) extractedValue = updated.valueText;
    else if (updated.valueNumber !== null) extractedValue = Number(updated.valueNumber);
    else if (updated.valueBoolean !== null) extractedValue = updated.valueBoolean;
    else if (updated.valueJson !== null) extractedValue = updated.valueJson;

    return {
      id: updated.id,
      workItemId: updated.workItemId,
      customFieldMetaDataId: updated.customFieldMetaDataId,
      value: extractedValue,
      customFieldMetaData: updated.customFieldMetaData
    };
  }

  /**
   * Purpose: Delete a single custom field value by fieldId and workItemId
   */
  async deleteValueByFieldId(workItemId: bigint, fieldId: bigint, orgId: bigint) {
    // Verify work item exists and belongs to org
    const workItem = await this.prisma.workItem.findFirst({
      where: {
        id: workItemId,
        OR: [
          { category: { orgId } },
          { categoryId: null }
        ]
      } as any
    });

    if (!workItem) {
      throw new Error('Work item not found');
    }

    // Verify field exists and belongs to org
    const field = await this.prisma.customFieldMetaData.findFirst({
      where: {
        id: fieldId,
        orgId
      }
    });

    if (!field) {
      throw new Error('Custom field not found');
    }

    // Check if value exists
    const value = await this.prisma.customFieldValue.findUnique({
      where: {
        workItemId_customFieldMetaDataId: {
          workItemId,
          customFieldMetaDataId: fieldId
        }
      }
    });

    if (!value) {
      throw new Error('Custom field value not found');
    }

    // Extract old value before deletion
    let extractedOldValue: any = null;
    if (value.valueText !== null) extractedOldValue = value.valueText;
    else if (value.valueNumber !== null) extractedOldValue = Number(value.valueNumber);
    else if (value.valueBoolean !== null) extractedOldValue = value.valueBoolean;
    else if (value.valueJson !== null) extractedOldValue = value.valueJson;

    // Delete the value
    await this.prisma.customFieldValue.delete({
      where: {
        workItemId_customFieldMetaDataId: {
          workItemId,
          customFieldMetaDataId: fieldId
        }
      }
    });

    // Log the deletion
    await this.prisma.workItemLog.create({
      data: {
        workItemId,
        logType: LogType.field_update,
        message: `Custom field "${field.name}" value deleted`
      }
    });

    // Emit domain event
    const fieldChanges: Record<string, FieldChange> = {
      [field.keyName]: {
        oldValue: extractedOldValue,
        newValue: null,
        fieldType: 'custom_field'
      }
    };

    await domainEventDispatcher.emit(
      DomainEventDispatcher.customFieldValueEvent(
        'delete',
        value.id,
        workItemId,
        orgId,
        workItem.categoryId,
        'user',
        [field.keyName],
        fieldChanges
      )
    );

    return { message: 'Custom field value deleted successfully' };
  }
}
