import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { UnauthorizedError } from "../../lib/errors";
import * as productsService from "./products.service";

export const listBrandsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const brands = await productsService.listBrands();
  res.status(200).json({ data: brands });
});

export const createBrandHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const brand = await productsService.createBrand(req.body, req.user.id);
  res.status(201).json({ data: brand });
});

export const updateBrandHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const brand = await productsService.updateBrand(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: brand });
});

export const listProductsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await productsService.listProducts(req.query as never);
  res.status(200).json(result);
});

export const getProductHandler = asyncHandler(async (req: Request, res: Response) => {
  const product = await productsService.getProduct(req.params.id as string);
  res.status(200).json({ data: product });
});

export const createProductHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const product = await productsService.createProduct(req.body, req.user.id);
  res.status(201).json({ data: product });
});

export const updateProductHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const product = await productsService.updateProduct(req.params.id as string, req.body, req.user.id);
  res.status(200).json({ data: product });
});
