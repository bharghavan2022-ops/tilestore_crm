import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import * as usersService from "./users.service";

export const listUsersHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await usersService.listUsers(req.query as never);
  res.status(200).json(result);
});

export const getMeHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const user = await usersService.getUser(req.user.id);
  res.status(200).json({ data: user });
});

export const getUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.getUser(req.params.id as string);
  res.status(200).json({ data: user });
});

export const createUserHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const user = await usersService.createUser(req.body, req.user.id);
  res.status(201).json({ data: user });
});

export const updateUserHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const user = await usersService.updateUser(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: user });
});
