// Vercel serverless entry point. Vercel's Node.js runtime treats a file
// under /api that default-exports an (req, res) => void handler as a
// function - an Express app's instance is exactly that shape, so no
// separate adapter is needed. vercel.json rewrites every request here;
// Express does its own internal routing from the original req.url.
import { createApp } from "../src/app";

const app = createApp();

export default app;
