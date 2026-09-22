import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import * as documentsService from "./documents.service";

export const listDocumentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await documentsService.listDocuments(req.query as never);
  res.status(200).json(result);
});

export const createDocumentHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const document = await documentsService.createDocument(req.body, req.user.id);
  res.status(201).json({ data: document });
});
