import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import { assertOwnCustomerOrStaff } from "../../lib/authz";
import * as customersService from "./customers.service";

export const listCustomersHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await customersService.listCustomers(req.query as never);
  res.status(200).json(result);
});

export const getCustomerHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const customer = await customersService.getCustomer(req.params.id as string);
  assertOwnCustomerOrStaff(req.user, customer.id);
  res.status(200).json({ data: customer });
});

export const createCustomerHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const customer = await customersService.createCustomer(req.body, req.user.id);
  res.status(201).json({ data: customer });
});

export const updateCustomerHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const customer = await customersService.updateCustomer(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: customer });
});

export const listContactsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  assertOwnCustomerOrStaff(req.user, req.params.customerId as string);
  const contacts = await customersService.listContacts(req.params.customerId as string);
  res.status(200).json({ data: contacts });
});

export const addContactHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const contact = await customersService.addContact(req.params.customerId as string, req.body, req.user.id);
  res.status(201).json({ data: contact });
});
