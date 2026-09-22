import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import * as employeesService from "./employees.service";

export const listEmployeesHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await employeesService.listEmployees(req.query as never);
  res.status(200).json(result);
});

export const getEmployeeHandler = asyncHandler(async (req: Request, res: Response) => {
  const employee = await employeesService.getEmployee(req.params.userId as string);
  res.status(200).json({ data: employee });
});

export const upsertEmployeeProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const profile = await employeesService.upsertEmployeeProfile(req.params.userId as string, req.body, req.user.id);
  res.status(200).json({ data: profile });
});
