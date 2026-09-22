import { z } from "zod";

export const profitabilityQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});
