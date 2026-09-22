import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../../middleware/validate";
import { authenticate } from "../../middleware/authenticate";
import { loginSchema, refreshSchema, changePasswordSchema } from "./auth.schema";
import * as authController from "./auth.controller";

export const authRouter = Router();

// Tighter limit than the global one to slow down credential-stuffing / brute force.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post("/login", loginLimiter, validate({ body: loginSchema }), authController.loginHandler);
authRouter.post("/refresh", validate({ body: refreshSchema }), authController.refreshHandler);
authRouter.post("/logout", validate({ body: refreshSchema }), authController.logoutHandler);
authRouter.post(
  "/change-password",
  authenticate,
  validate({ body: changePasswordSchema }),
  authController.changePasswordHandler,
);
