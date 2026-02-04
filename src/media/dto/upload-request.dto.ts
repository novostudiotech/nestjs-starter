import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UploadContext } from '../enums';

const uploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  context: z.enum(UploadContext),
});

export class UploadRequestDto extends createZodDto(uploadRequestSchema) {}
