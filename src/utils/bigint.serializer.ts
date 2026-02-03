/**
 * Purpose: Serialize values for JSON responses
 * Now a passthrough since BigInts are removed from the codebase
 */
export function serializeBigInt(obj: any): any {
  return obj;
}

export const serializeNumber = serializeBigInt;
