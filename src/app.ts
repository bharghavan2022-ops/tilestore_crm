import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { healthRouter } from "./routes/health.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { teamsRouter } from "./modules/teams/teams.routes";
import { customersRouter } from "./modules/customers/customers.routes";
import { leadsRouter } from "./modules/leads/leads.routes";
import { quotationsRouter } from "./modules/quotations/quotations.routes";
import { productsRouter } from "./modules/products/products.routes";
import { warehousesRouter } from "./modules/warehouses/warehouses.routes";
import { inventoryRouter } from "./modules/inventory/inventory.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { vendorsRouter } from "./modules/vendors/vendors.routes";
import { purchaseOrdersRouter } from "./modules/purchaseOrders/purchaseOrders.routes";
import { logisticsRouter } from "./modules/logistics/logistics.routes";
import { invoicesRouter } from "./modules/invoices/invoices.routes";
import { paymentsRouter } from "./modules/payments/payments.routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","), credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url?.startsWith("/health") ?? false } }));

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use("/health", healthRouter);

  const api = express.Router();
  api.use("/auth", authRouter);
  api.use("/users", usersRouter);
  api.use("/teams", teamsRouter);
  api.use("/customers", customersRouter);
  api.use("/leads", leadsRouter);
  api.use("/quotations", quotationsRouter);
  api.use("/products", productsRouter);
  api.use("/warehouses", warehousesRouter);
  api.use("/inventory", inventoryRouter);
  api.use("/orders", ordersRouter);
  api.use("/vendors", vendorsRouter);
  api.use("/purchase-orders", purchaseOrdersRouter);
  api.use("/logistics", logisticsRouter);
  api.use("/invoices", invoicesRouter);
  api.use("/payments", paymentsRouter);
  app.use("/api/v1", api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
