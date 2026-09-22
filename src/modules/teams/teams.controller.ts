import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import * as teamsService from "./teams.service";
import { UnauthorizedError } from "../../lib/errors";

export const listTeamsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const teams = await teamsService.listTeams();
  res.status(200).json({ data: teams });
});

export const getTeamHandler = asyncHandler(async (req: Request, res: Response) => {
  const team = await teamsService.getTeam(req.params.id as string);
  res.status(200).json({ data: team });
});

export const createTeamHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const team = await teamsService.createTeam(req.body, req.user.id);
  res.status(201).json({ data: team });
});

export const updateTeamHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const team = await teamsService.updateTeam(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: team });
});
