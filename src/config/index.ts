/* eslint-disable no-console */
import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();

const envSchema = z.object({
  DB: z.string().min(1, "DB connection string is required"),
  PORT: z.string().min(1, "PORT is required"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  SALT_ROUNDS: z.string().min(1, "SALT_ROUNDS is required"),
  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
  JWT_ACCESS_EXPIRE_IN: z.string().min(1, "JWT_ACCESS_EXPIRE_IN is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_REFRESH_EXPIRE_IN: z.string().min(1, "JWT_REFRESH_EXPIRE_IN is required"),
  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN is required"),
});

// Parse & return validated env
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.table(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

export default {
  DB: env.DB,
  PORT: env.PORT,
  NODE_ENV: env.NODE_ENV,
  SALT_ROUNDS: env.SALT_ROUNDS,
  JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET,
  JWT_ACCESS_EXPIRE_IN: env.JWT_ACCESS_EXPIRE_IN,
  JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRE_IN: env.JWT_REFRESH_EXPIRE_IN,
  CORS_ORIGIN: env.CORS_ORIGIN,
};
