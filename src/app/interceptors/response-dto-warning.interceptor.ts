import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import type { Response } from 'express';
import { type Observable, tap } from 'rxjs';

interface ZodSchema {
  shape?: Record<string, ZodSchema>;
  _zod?: {
    def: {
      type: string;
      element?: ZodSchema;
      innerType?: ZodSchema;
    };
  };
}

interface ResponseMetadataEntry {
  type?: { isZodDto?: boolean; schema?: ZodSchema };
  isArray?: boolean;
}

function unwrapSchema(schema: ZodSchema): ZodSchema {
  const type = schema._zod?.def.type;
  if (type === 'nullable' || type === 'optional') {
    const inner = schema._zod?.def.innerType;
    return inner ? unwrapSchema(inner) : schema;
  }
  return schema;
}

function compareObjectKeys(
  data: Record<string, unknown>,
  shape: Record<string, ZodSchema>,
  path: string
): string[] {
  const shapeKeys = new Set(Object.keys(shape));
  const extras: string[] = [];

  for (const key of Object.keys(data)) {
    const childPath = path ? `${path}.${key}` : key;
    if (!shapeKeys.has(key)) {
      extras.push(childPath);
    } else {
      extras.push(...findExtraKeys(data[key], shape[key], childPath));
    }
  }
  return extras;
}

const ARRAY_SAMPLE_SIZE = 10;

function sampleArrayExtras(data: unknown[], element: ZodSchema, path: string): string[] {
  const seen = new Set<string>();
  const extras: string[] = [];
  for (let i = 0; i < Math.min(data.length, ARRAY_SAMPLE_SIZE); i++) {
    for (const key of findExtraKeys(data[i], element, `${path}[${i}]`)) {
      const normalized = key.replace(/\[\d+\]/g, '[]');
      if (!seen.has(normalized)) {
        seen.add(normalized);
        extras.push(key);
      }
    }
  }
  return extras;
}

/**
 * Compares actual response keys against the Zod schema declared in the DTO.
 * Returns field paths (e.g. "place.googleId", "items[0].slug") not present in the schema.
 */
function findExtraKeys(data: unknown, schema: ZodSchema, path: string): string[] {
  if (data == null) return [];

  const resolved = unwrapSchema(schema);
  const def = resolved._zod?.def;

  if (Array.isArray(data)) {
    const element = def?.type === 'array' ? def.element : undefined;
    if (!element || data.length === 0) return [];
    return sampleArrayExtras(data, element, path);
  }

  if (typeof data === 'object' && resolved.shape) {
    return compareObjectKeys(data as Record<string, unknown>, resolved.shape, path);
  }

  return [];
}

@Injectable()
export class ResponseDtoWarningInterceptor implements NestInterceptor {
  private readonly logger = new Logger('DtoWarning');

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap((data) => {
        try {
          this.check(context, data);
        } catch {
          // Never block a response
        }
      })
    );
  }

  private check(context: ExecutionContext, data: unknown): void {
    if (data === null || data === undefined || typeof data !== 'object') return;

    const metadata = this.reflector.get<Record<string, ResponseMetadataEntry> | undefined>(
      DECORATORS.API_RESPONSE,
      context.getHandler()
    );
    if (!metadata) return;

    const statusCode = context.switchToHttp().getResponse<Response>().statusCode;
    const entry = metadata[String(statusCode)];
    const DtoClass = entry?.type;

    if (!DtoClass?.isZodDto || !DtoClass.schema) return;

    const schema = DtoClass.schema as ZodSchema;
    const body = entry.isArray && Array.isArray(data) ? data[0] : data;
    if (!body || typeof body !== 'object') return;

    const extras = findExtraKeys(body, schema, '');
    if (extras.length === 0) return;

    const handlerName = `${context.getClass().name}.${context.getHandler().name}`;
    for (const field of extras) {
      this.logger.warn(`Response field "${field}" not in DTO schema [${handlerName}]`);
    }
  }
}
