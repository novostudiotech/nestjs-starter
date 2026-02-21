import type { OpenAPIV3_1 } from 'openapi-types';
import { expect, test } from './fixtures';
import {
  type DereferencedSpec,
  dereferenceSpec,
  findExtraProperties,
} from './helpers/schema-validator';

/**
 * Public GET endpoints that don't require authentication and return JSON.
 * Derived from controllers decorated with @AllowAnonymous().
 * @AllowAnonymous is a runtime guard bypass, not an OpenAPI annotation,
 * so we must list these explicitly.
 */
const PUBLIC_GET_ENDPOINTS = ['/geo/countries', '/geo/locate', '/health'];

function getResponseSchema(
  spec: DereferencedSpec,
  pathTemplate: string,
  statusCode: number
): OpenAPIV3_1.SchemaObject | undefined {
  const pathItem = spec.paths?.[pathTemplate] as OpenAPIV3_1.PathItemObject | undefined;
  if (!pathItem) return undefined;

  const operation = pathItem.get as OpenAPIV3_1.OperationObject | undefined;
  if (!operation) return undefined;

  const responses = operation.responses || {};
  const statusStr = String(statusCode);
  const responseObj = (responses[statusStr] || responses.default) as
    | OpenAPIV3_1.ResponseObject
    | undefined;
  if (!responseObj) return undefined;

  return responseObj.content?.['application/json']?.schema as OpenAPIV3_1.SchemaObject | undefined;
}

test.describe('Response Contract Validation', () => {
  let spec: DereferencedSpec;

  test.beforeAll(async ({ baseURL }) => {
    const response = await fetch(`${baseURL}/docs-json`);
    const rawSpec = (await response.json()) as OpenAPIV3_1.Document;
    spec = await dereferenceSpec(rawSpec);
  });

  test('public GET endpoints should match their OpenAPI schemas', async ({ useHttp }) => {
    const http = useHttp();
    const allViolations: string[] = [];

    for (const path of PUBLIC_GET_ENDPOINTS) {
      const { status, data } = await http.get(path);

      if (status !== 200) continue;

      const schema = getResponseSchema(spec, path, status);
      if (!schema) {
        allViolations.push(`GET ${path} → no response schema found in spec`);
        continue;
      }

      const violations = findExtraProperties(data, schema, '');
      for (const v of violations) {
        allViolations.push(`GET ${path} → ${v}: in response but not in schema`);
      }
    }

    expect(
      allViolations,
      `Response/schema mismatches found:\n${allViolations.join('\n')}`
    ).toHaveLength(0);
  });
});
