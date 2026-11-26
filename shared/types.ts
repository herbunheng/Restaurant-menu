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

/**
 * Category & Menu Item Schemas & Types
 */
export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Category name is required'),
  description: z.string().nullable().optional(),
  sortOrder: z.number().default(0),
  createdAt: z.union([z.date(), z.string()]).nullable().optional(),
});

export type Category = z.infer<typeof CategorySchema>;

export const CreateCategoryInputSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  sortOrder: z.number().optional().default(0),
});

export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>;

export const MenuItemVariantSchema = z.object({
  label: z.string().min(1, 'Option name is required'),
  price: z.coerce.number().min(0, 'Price must be positive'),
});

export type MenuItemVariant = z.infer<typeof MenuItemVariantSchema>;

export const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Item name is required'),
  categoryId: z.string().nullable().optional(),
  price: z.number().min(0, 'Price must be positive'),
  currency: z.string().default('USD'),
  imageUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isAvailable: z.boolean().default(true),
  hasVariants: z.boolean().default(false),
  variants: z.array(MenuItemVariantSchema).nullable().optional(),
  createdAt: z.union([z.date(), z.string()]).nullable().optional(),
  updatedAt: z.union([z.date(), z.string()]).nullable().optional(),
  categoryName: z.string().optional(),
});

export type MenuItem = z.infer<typeof MenuItemSchema>;

export const CreateMenuItemInputSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  categoryId: z.string().nullable().optional(),
  price: z.coerce.number().min(0, 'Price must be at least 0'),
  currency: z.string().optional().default('USD'),
  imageUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isAvailable: z.boolean().optional().default(true),
  hasVariants: z.boolean().optional().default(false),
  variants: z.array(MenuItemVariantSchema).optional().default([]),
});

export type CreateMenuItemInput = z.infer<typeof CreateMenuItemInputSchema>;

export const UpdateMenuItemInputSchema = CreateMenuItemInputSchema.partial();
export type UpdateMenuItemInput = z.infer<typeof UpdateMenuItemInputSchema>;

/**
 * Order & POS Schemas & Types
 */
export const OrderItemSchema = z.object({
  menuItemId: z.string(),
  name: z.string(),
  variantLabel: z.string().optional().default(''),
  price: z.coerce.number().min(0),
  quantity: z.coerce.number().min(1),
  subtotal: z.coerce.number().min(0),
  note: z.string().optional().default(''),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  orderNumber: z.number(),
  tableNumber: z.string(),
  items: z.array(OrderItemSchema),
  subtotal: z.number(),
  discount: z.number().default(0),
  totalAmount: z.number(),
  paymentMethod: z.enum(['cash', 'khqr', 'card']).default('cash'),
  paymentStatus: z.enum(['paid', 'pending', 'cancelled']).default('paid'),
  cashierName: z.string().optional().default('Cashier'),
  note: z.string().nullable().optional(),
  createdAt: z.union([z.date(), z.string()]).nullable().optional(),
  updatedAt: z.union([z.date(), z.string()]).nullable().optional(),
});

export type Order = z.infer<typeof OrderSchema>;

export const CreateOrderInputSchema = z.object({
  tableNumber: z.string().min(1, 'Table number is required'),
  items: z.array(OrderItemSchema).min(1, 'Order must contain at least one item'),
  discount: z.coerce.number().min(0).optional().default(0),
  paymentMethod: z.enum(['cash', 'khqr', 'card']).optional().default('cash'),
  paymentStatus: z.enum(['paid', 'pending', 'cancelled']).optional().default('paid'),
  cashierName: z.string().optional().default('Cashier'),
  note: z.string().optional().default(''),
});

export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

export interface TopSellingItem {
  name: string;
  variantLabel?: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface DailyReport {
  date: string;
  totalOrders: number;
  totalRevenueUSD: number;
  totalRevenueKHR: number;
  paymentBreakdown: {
    cashUSD: number;
    khqrUSD: number;
    cardUSD: number;
  };
  topSellingItems: TopSellingItem[];
  orders: Order[];
}

