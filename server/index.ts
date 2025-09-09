import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  // Increase JSON / urlencoded body size to allow base64 file uploads from client fallback
  const bodyLimit = process.env.UPLOAD_BODY_LIMIT || "20mb";
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // upload endpoint used to perform storage operations server-side with service_role key
  try {
    // lazy import to avoid dependency issues in environments that don't need the routes
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { handleUpload } = require("./routes/upload");
    app.post("/api/upload", handleUpload as any);
  } catch (err) {
    // ignore if route cannot be registered
    // eslint-disable-next-line no-console
    console.warn("[server] upload route not registered:", err?.message ?? err);
  }

  try {
    // signed URL route
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { handleSignedUrl } = require("./routes/signedUrl");
    app.post("/api/signed-url", handleSignedUrl as any);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[server] signed-url route not registered:", err?.message ?? err);
  }

  try {
    // admin characters route (server-side, requires master role)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { handleAdminCharacters } = require("./routes/adminCharacters");
    app.post("/api/admin/characters", handleAdminCharacters as any);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[server] adminCharacters route not registered:", err?.message ?? err);
  }

  try {
    // character by user route (server-side, requires owner or master)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { handleCharacterByUser } = require("./routes/characterByUser");
    app.post("/api/character", handleCharacterByUser as any);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[server] characterByUser route not registered:", err?.message ?? err);
  }

  return app;
}
