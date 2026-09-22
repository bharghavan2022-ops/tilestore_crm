import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { BadRequestError } from "../lib/errors";

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

// Validates and replaces req.body/query/params with the parsed (and
// type-coerced) values so downstream handlers never re-validate input.
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (err) {
      next(new BadRequestError("Validation failed", (err as { issues?: unknown }).issues ?? err));
    }
  };
}
