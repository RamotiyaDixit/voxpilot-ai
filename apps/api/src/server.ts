import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { ZodError } from "zod";
import { agentsRouter } from "./routes/agents.js";
import { callsRouter } from "./routes/calls.js";
import { chatRouter } from "./routes/chat.js";

const app = express();
const port = Number(process.env.API_PORT ?? 4100);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: webOrigin.split(",").map((value) => value.trim()), methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"] }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "voxpilot-api", timestamp: new Date().toISOString() });
});
app.use("/api/agents", agentsRouter);
app.use("/api/calls", callsRouter);
app.use("/api/chat", chatRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) });
    return;
  }
  const message = error instanceof Error ? error.message : "Unexpected server error";
  console.error(error);
  res.status(500).json({ error: process.env.NODE_ENV === "production" ? "Internal server error" : message });
});

app.listen(port, () => {
  console.log(`VoxPilot API listening on http://localhost:${port}`);
});
