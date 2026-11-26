import { z } from 'zod';

/**
 * Zod Schema for API Response wrapper
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.unknown().optional(),
      })
      .optional(),
    timestamp: z.string(),
  });

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * Zod Schema & interface for Health Status
 */
export const HealthStatusSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  service: z.string(),
  version: z.string(),
  uptime: z.number(),
  timestamp: z.string(),
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

/**
 * Pagination Zod Schema & Interfaces
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
});

export type PaginationParams = z.infer<typeof PaginationSchema>;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * User Schema & Types
 */
export const UserRoleSchema = z.enum(['user', 'admin', 'super_admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserStatusSchema = z.enum(['active', 'suspended', 'pending']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  passwordHash: z.string().nullable().optional(),
  role: UserRoleSchema,
  avatarUrl: z.string().nullable().optional(),
  status: UserStatusSchema,
  createdAt: z.union([z.date(), z.string()]).nullable().optional(),
  updatedAt: z.union([z.date(), z.string()]).nullable().optional(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: UserRoleSchema.default('user'),
  avatarUrl: z.string().optional(),
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

/**
 * Super Admin Schema & Types
 */
export const SuperAdminSchema = z.object({
  id: z.string(),
  userId: z.string(),
  canManageSettings: z.boolean(),
  canManageAdmins: z.boolean(),
  createdAt: z.union([z.date(), z.string()]).nullable().optional(),
  updatedAt: z.union([z.date(), z.string()]).nullable().optional(),
});

export type SuperAdmin = z.infer<typeof SuperAdminSchema>;

/**
 * Site Settings & Config (Branding, Telegram, Resend Mail, Auth, Maintenance, SEO)
 */
export const SiteSettingsSchema = z.object({
  id: z.string(),
  siteName: z.string(),
  siteDescription: z.string().nullable().optional(),
  siteUrl: z.string().nullable().optional(),
  siteLogoUrl: z.string().nullable().optional(),
  siteFaviconUrl: z.string().nullable().optional(),
  supportEmail: z.string().nullable().optional(),
  
  // Telegram Integration Config
  telegramToken: z.string().nullable().optional(),
  telegramGroupId: z.string().nullable().optional(),
  telegramEnabled: z.boolean(),
  
  // Resend Mail Integration Config
  resendApiKey: z.string().nullable().optional(),
  mailFrom: z.string().nullable().optional(),
  mailFromName: z.string().nullable().optional(),
  resendEnabled: z.boolean(),
  
  // Notification Secret Token & Push VAPID
  notificationToken: z.string().nullable().optional(),
  vapidPublicKey: z.string().nullable().optional(),

  // Google OAuth Config
  googleClientId: z.string().nullable().optional(),
  googleClientSecret: z.string().nullable().optional(),
  googleAuthEnabled: z.boolean().optional(),

  // Auth & Security Settings
  allowRegistration: z.boolean(),
  requireEmailVerification: z.boolean(),

  // Maintenance & System Control
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().nullable().optional(),

  // Analytics & SEO
  googleAnalyticsId: z.string().nullable().optional(),
  
  updatedBy: z.string().nullable().optional(),
  createdAt: z.union([z.date(), z.string()]).nullable().optional(),
  updatedAt: z.union([z.date(), z.string()]).nullable().optional(),
});

export type SiteSettings = z.infer<typeof SiteSettingsSchema>;

export const UpdateSiteSettingsSchema = z.object({
  siteName: z.string().min(1).optional(),
  siteDescription: z.string().nullable().optional(),
  siteUrl: z.string().nullable().optional(),
  siteLogoUrl: z.string().nullable().optional(),
  siteFaviconUrl: z.string().nullable().optional(),
  supportEmail: z.string().nullable().optional(),
  
  // Telegram Integration Config
  telegramToken: z.string().nullable().optional(),
  telegramGroupId: z.string().nullable().optional(),
  telegramEnabled: z.boolean().optional(),
  
  // Resend Mail Integration Config
  resendApiKey: z.string().nullable().optional(),
  mailFrom: z.string().nullable().optional(),
  mailFromName: z.string().nullable().optional(),
  resendEnabled: z.boolean().optional(),
  
  // Notification Secret Token
  notificationToken: z.string().nullable().optional(),

  // Auth & Security Settings
  allowRegistration: z.boolean().optional(),
  requireEmailVerification: z.boolean().optional(),

  // Maintenance & System Control
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().nullable().optional(),

  // Analytics & SEO
  googleAnalyticsId: z.string().nullable().optional(),
});

export type UpdateSiteSettings = z.infer<typeof UpdateSiteSettingsSchema>;

/**
 * Audit Log Schema & Types
 */
export const AuditLogSchema = z.object({
  id: z.string(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  userEmail: z.string().nullable().optional(),
  userRole: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  route: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
  status: z.enum(['SUCCESS', 'FAILED']),
  createdAt: z.union([z.date(), z.string()]).nullable().optional(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

export const CreateAuditLogSchema = z.object({
  action: z.string().min(1),
  entity: z.string().min(1),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  userEmail: z.string().optional(),
  userRole: z.string().optional(),
  details: z.record(z.unknown()).or(z.string()).optional(),
  status: z.enum(['SUCCESS', 'FAILED']).default('SUCCESS'),
});

export type CreateAuditLog = z.infer<typeof CreateAuditLogSchema>;

/**
 * Authentication Schemas & Types
 */
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const UpdateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  avatarUrl: z.string().nullable().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const AuthUserSchema = UserSchema.omit({ passwordHash: true });
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: AuthUserSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

/**
 * Visitor Analytics Summary Types & Schemas
 */
export const CountryMetricSchema = z.object({
  country: z.string(),
  count: z.number(),
});
export type CountryMetric = z.infer<typeof CountryMetricSchema>;

export const RegionMetricSchema = z.object({
  region: z.string(),
  country: z.string(),
  count: z.number(),
});
export type RegionMetric = z.infer<typeof RegionMetricSchema>;

export const DeviceMetricSchema = z.object({
  device: z.string(),
  count: z.number(),
});
export type DeviceMetric = z.infer<typeof DeviceMetricSchema>;

export const PathMetricSchema = z.object({
  path: z.string(),
  count: z.number(),
});
export type PathMetric = z.infer<typeof PathMetricSchema>;

export const AudienceAnalysisSchema = z.object({
  device: z.string(),       // e.g. "📱 Device: DESKTOP"
  os: z.string(),           // e.g. "🖥️ OS: Windows 10"
  brand: z.string(),        // e.g. "🏷️ Brand: Unknown"
  browser: z.string(),      // e.g. "🌐 Browser: Edge 12.246"
  ipAddress: z.string(),    // e.g. "🔹 IP Address: 104.197.69.115"
  connection: z.string(),   // e.g. "📡 Connection: 🖥️ Datacenter/VPN"
  isp: z.string(),          // e.g. "🏢 ISP: Google LLC"
  location: z.string(),     // e.g. "📍 Location: Council Bluffs, Iowa (United States)"
  coordinates: z.string(),  // e.g. "📌 Coordinates: Not available"
  time: z.string(),         // e.g. "⏰ Time: 25/09/2026, 13:23:09"
  raw: z.record(z.unknown()).optional(),
});

export type AudienceAnalysis = z.infer<typeof AudienceAnalysisSchema>;

export const TrackCustomEventSchema = z.object({
  eventName: z.string().min(1, 'Event name is required'),
  eventCategory: z.string().nullable().optional(),
  eventLabel: z.string().nullable().optional(),
  eventValue: z.number().nullable().optional(),
  path: z.string().nullable().optional(),
  sessionId: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export type TrackCustomEvent = z.infer<typeof TrackCustomEventSchema>;

export const CustomEventItemSchema = z.object({
  id: z.string(),
  sessionId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  eventName: z.string(),
  eventCategory: z.string().nullable().optional(),
  eventLabel: z.string().nullable().optional(),
  eventValue: z.number().nullable().optional(),
  path: z.string(),
  metadata: z.string().nullable().optional(),
  createdAt: z.union([z.date(), z.string()]).nullable().optional(),
});

export type CustomEventItem = z.infer<typeof CustomEventItemSchema>;

export const VisitorAnalyticsSummarySchema = z.object({
  totalVisits: z.number(),
  topCountries: z.array(CountryMetricSchema),
  topRegions: z.array(RegionMetricSchema),
  devices: z.array(DeviceMetricSchema),
  osBreakdown: z.array(z.object({ os: z.string(), count: z.number() })),
  ispBreakdown: z.array(z.object({ isp: z.string(), count: z.number() })),
  topPaths: z.array(PathMetricSchema),
  recentVisits: z.array(z.record(z.unknown())),
  recentEvents: z.array(CustomEventItemSchema).optional(),
  audienceAnalyses: z.array(AudienceAnalysisSchema).optional(),
});

export type VisitorAnalyticsSummary = z.infer<typeof VisitorAnalyticsSummarySchema>;

/**
 * Cloudinary Media Upload Schemas & Types
 */
export const CloudinaryUploadResponseSchema = z.object({
  publicId: z.string(),
  url: z.string().url(),
  resourceType: z.enum(['image', 'video', 'raw']).or(z.string()),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  pages: z.number().nullable().optional(),
  duration: z.number().nullable().optional(),
  format: z.string(),
  bytes: z.number(),
  createdAt: z.string(),
});

export type CloudinaryUploadResponse = z.infer<typeof CloudinaryUploadResponseSchema>;

export interface UploadOptions {
  folder?: string;
  field?: 'image' | 'file' | 'pdf' | 'video' | 'document';
  apiKey?: string;
  onProgress?: (percent: number) => void;
}

