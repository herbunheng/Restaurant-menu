import { z } from "zod";

export const EnvSchema = z.object({
  ENVIRONMENT: z
    .enum(["development", "staging", "production"])
    .default("development"),
  JWT_SECRET: z.string().optional(),
  // Super Admin Credentials from .env
  INITIAL_ADMIN_EMAIL: z.string().email().optional(),
  INITIAL_ADMIN_PASSWORD: z.string().optional(),
  INITIAL_ADMIN_NAME: z.string().optional(),
  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_PASSWORD: z.string().optional(),
  SUPER_ADMIN_NAME: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  NOTIFICATION_SECRET_KEY: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof EnvSchema>;
