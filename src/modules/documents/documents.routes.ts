import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireStaff } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { createDocumentSchema, listDocumentsQuerySchema } from "./documents.schema";
import * as documentsController from "./documents.controller";

export const documentsRouter = Router();

// Documents attach to internal entities (leads, orders, ...) - staff only for now.
documentsRouter.use(authenticate, requireStaff);

documentsRouter.get("/", validate({ query: listDocumentsQuerySchema }), documentsController.listDocumentsHandler);
documentsRouter.post("/", validate({ body: createDocumentSchema }), documentsController.createDocumentHandler);
