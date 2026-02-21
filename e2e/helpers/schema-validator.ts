import { dereference } from '@readme/openapi-parser';
import type { OpenAPI, OpenAPIV3_1 } from 'openapi-types';

export type DereferencedSpec = OpenAPIV3_1.Document;

/**
 * Dereference all $ref pointers in an OpenAPI spec.
 * Temporarily downgrades to 3.0.0 since NestJS generates 3.0.x-style schemas
 * but the project overrides openapi version to 3.1.0 for Orval compatibility.
 */
export async function dereferenceSpec(specData: OpenAPI.Document): Promise<DereferencedSpec> {
  const clone = structuredClone(specData) as Record<string, unknown>;
  const originalVersion = clone.openapi;
  clone.openapi = '3.0.0';
  const result = (await dereference(clone as OpenAPI.Document)) as DereferencedSpec;
  result.openapi = (originalVersion as string) || '3.1.0';
  return result;
}

/**
 * Match an actual URL (e.g. `/events/abc`) to an OpenAPI path template (e.g. `/events/{id}`).
 * Returns the matching path string or undefined.
 */
export function matchUrlToPath(url: string, paths: string[]): string | undefined {
  // Strip query string
  const urlPath = url.split('?')[0];

  // Try exact match first
  if (paths.includes(urlPath)) return urlPath;

  // Build regex for each path template, sorted by specificity (more literal segments first)
  const sorted = [...paths].sort((a, b) => {
    const aParams = (a.match(/\{[^}]+\}/g) || []).length;
    const bParams = (b.match(/\{[^}]+\}/g) || []).length;
    return aParams - bParams;
  });

  for (const pathTemplate of sorted) {
    const pattern = pathTemplate.replace(/\{[^}]+\}/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    if (regex.test(urlPath)) return pathTemplate;
  }

  return undefined;
}

interface SchemaObject {
  type?: string | string[];
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  additionalProperties?: boolean | SchemaObject;
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  allOf?: SchemaObject[];
  nullable?: boolean;
}

/**
 * Recursively compare response data keys against schema properties.
 * Returns a list of violation strings like "countries[0].slug".
 */
export function findExtraProperties(
  data: unknown,
  schema: SchemaObject | undefined,
  path: string
): string[] {
  if (!schema || data === null || data === undefined) return [];

  // Handle composed schemas (oneOf/anyOf/allOf)
  if (schema.oneOf || schema.anyOf || schema.allOf) {
    const variants = schema.oneOf || schema.anyOf || schema.allOf || [];
    const mergedProperties: Record<string, SchemaObject> = {};
    for (const variant of variants) {
      if (variant.properties) {
        Object.assign(mergedProperties, variant.properties);
      }
    }
    if (schema.properties) {
      Object.assign(mergedProperties, schema.properties);
    }
    if (Object.keys(mergedProperties).length > 0) {
      const merged: SchemaObject = { type: 'object', properties: mergedProperties };
      return findExtraProperties(data, merged, path);
    }
    return [];
  }

  // Handle arrays
  if (Array.isArray(data)) {
    if (schema.items) {
      const violations: string[] = [];
      for (let i = 0; i < data.length; i++) {
        violations.push(...findExtraProperties(data[i], schema.items, `${path}[${i}]`));
      }
      return violations;
    }
    return [];
  }

  // Handle objects
  if (typeof data === 'object' && data !== null && data.constructor === Object) {
    if (schema.additionalProperties === true || typeof schema.additionalProperties === 'object') {
      return [];
    }

    const properties = schema.properties || {};
    const violations: string[] = [];

    for (const key of Object.keys(data)) {
      const childPath = path ? `${path}.${key}` : key;
      if (!(key in properties)) {
        violations.push(childPath);
      } else {
        violations.push(
          ...findExtraProperties((data as Record<string, unknown>)[key], properties[key], childPath)
        );
      }
    }

    return violations;
  }

  return [];
}

/**
 * Validate a response body against the OpenAPI spec.
 * Returns a list of violation strings.
 */
export function validateResponse(
  spec: DereferencedSpec,
  method: string,
  url: string,
  statusCode: number,
  body: unknown
): string[] {
  const paths = Object.keys(spec.paths || {});
  const matchedPath = matchUrlToPath(url, paths);
  if (!matchedPath) return [`No path matched for ${url}`];

  const pathItem = spec.paths?.[matchedPath] as OpenAPIV3_1.PathItemObject;
  const operation = pathItem[method.toLowerCase() as keyof OpenAPIV3_1.PathItemObject] as
    | OpenAPIV3_1.OperationObject
    | undefined;
  if (!operation) return [`No ${method} operation for ${matchedPath}`];

  const responses = operation.responses || {};
  const statusStr = String(statusCode);
  const responseObj = (responses[statusStr] || responses.default) as
    | OpenAPIV3_1.ResponseObject
    | undefined;
  if (!responseObj) return [`No response schema for ${statusStr} on ${method} ${matchedPath}`];

  const content = responseObj.content;
  if (!content || !content['application/json']) return [];

  const schema = content['application/json'].schema as SchemaObject | undefined;
  return findExtraProperties(body, schema, '');
}
