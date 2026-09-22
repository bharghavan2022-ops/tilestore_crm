import { z } from "zod";

export const documentCategoryEnum = z.enum(["RAW_VIDEO", "EDITED_VIDEO", "IMAGE", "DOCUMENT", "MARKETING_CREATIVE"]);

export const createDocumentSchema = z.object({
  entityType: z.string().min(1).max(60),
  entityId: z.string().min(1),
  category: documentCategoryEnum,
  title: z.string().max(200).optional(),
  // Deliberately just a URL, not a file upload: storage is Google Drive
  // (the shared source of truth), so this backend stores the link/metadata
  // only. A row only exists once a real link is known - see schema.prisma.
  fileUrl: z.string().url("A valid file link is required"),
});

export const listDocumentsQuerySchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
