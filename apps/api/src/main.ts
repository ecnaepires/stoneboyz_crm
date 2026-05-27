import "./env.js";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import * as express from "express";
import * as path from "path";
import { fileURLToPath } from "url";

const DEFAULT_PORT = 3001;

const parsePort = (value: string | undefined): number => {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const uploadsDir = path.join(__dirname, "..", "uploads");
  app.use("/uploads", express.static(uploadsDir));

  app.setGlobalPrefix("api/v1");
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:3000", "http://localhost:3001"];

  app.enableCors({
    origin: corsOrigins,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.listen(parsePort(process.env.PORT));
}

void bootstrap();
