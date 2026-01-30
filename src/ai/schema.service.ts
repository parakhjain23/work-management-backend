import { Prisma } from '@prisma/client';

export interface SchemaColumn {
  type: string;
  nullable: boolean;
  enum_values?: string[];
}

export interface SchemaRelation {
  references: string;
}

export interface SchemaTable {
  primary_key: string;
  columns: Record<string, SchemaColumn>;
  relations: Record<string, SchemaRelation>;
}

export interface SchemaResponse {
  tables: Record<string, SchemaTable>;
}

export class SchemaService {
  private cachedSchema: SchemaResponse | null = null;

  private mapPrismaTypeToSqlType(field: any): string {
    const typeMap: Record<string, string> = {
      'Int': 'INTEGER',
      'BigInt': 'BIGINT',
      'String': 'VARCHAR',
      'Boolean': 'BOOLEAN',
      'DateTime': 'TIMESTAMP',
      'Decimal': 'DECIMAL',
      'Json': 'JSON',
      'Float': 'FLOAT',
    };

    if (field.kind === 'enum') {
      return 'ENUM';
    }

    return typeMap[field.type] || field.type.toUpperCase();
  }

  public getSchema(): SchemaResponse {
    if (this.cachedSchema) {
      return this.cachedSchema;
    }

    const dmmf = Prisma.dmmf;
    const tables: Record<string, SchemaTable> = {};

    for (const model of dmmf.datamodel.models) {
      const tableName = model.dbName || model.name.toLowerCase();
      
      const primaryKeyField = model.fields.find(f => f.isId);
      const primaryKey = primaryKeyField?.dbName || primaryKeyField?.name || 'id';

      const columns: Record<string, SchemaColumn> = {};
      const relations: Record<string, SchemaRelation> = {};

      for (const field of model.fields) {
        if (field.kind === 'object') {
          continue;
        }

        const columnName = field.dbName || field.name;
        
        const column: SchemaColumn = {
          type: this.mapPrismaTypeToSqlType(field),
          nullable: !field.isRequired,
        };

        if (field.kind === 'enum') {
          const enumDef = dmmf.datamodel.enums.find(e => e.name === field.type);
          if (enumDef) {
            column.enum_values = enumDef.values.map(v => v.name);
          }
        }

        columns[columnName] = column;
      }

      for (const field of model.fields) {
        if (field.kind === 'object' && field.relationFromFields && field.relationFromFields.length > 0) {
          const relatedModel = dmmf.datamodel.models.find(m => m.name === field.type);
          if (relatedModel) {
            const relatedTableName = relatedModel.dbName || relatedModel.name.toLowerCase();
            const relatedPrimaryKey = relatedModel.fields.find(f => f.isId);
            const relatedPkName = relatedPrimaryKey?.dbName || relatedPrimaryKey?.name || 'id';

            for (const fromField of field.relationFromFields) {
              const columnName = model.fields.find(f => f.name === fromField)?.dbName || fromField;
              relations[columnName] = {
                references: `${relatedTableName}.${relatedPkName}`
              };
            }
          }
        }
      }

      tables[tableName] = {
        primary_key: primaryKey,
        columns,
        relations,
      };
    }

    this.cachedSchema = { tables };
    return this.cachedSchema;
  }

  public clearCache(): void {
    this.cachedSchema = null;
  }
}
