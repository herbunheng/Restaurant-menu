import type { Context } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import { createSuccessResponse, createErrorResponse } from "@restaurant-menu/shared";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { users, superAdmins, siteSettings } from "../db/schema";
import { hashPassword, verifyPassword, encryptConfigPayload, encryptToken } from "../utils/crypto";
import { logAudit } from "../services/audit";
import type { AppEnv } from "../types";

/**
 * Controller to register a new user
 */
export async function registerController(c: Context<AppEnv>) {
  if (!c.env.DB) {
    return c.json(
      createErrorResponse("DB_MISSING", "Database binding missing"),
      500,
    );
  }

  const jwtSecret = c.env.JWT_SECRET;
  if (!jwtSecret) {
    return c.json(
      createErrorResponse(
        "SERVER_CONFIG_ERROR",
        "Server authentication secret is missing",
      ),
      500,
    );
  }

  const body = await c.req.json();
  const db = getDb(c.env.DB);

  // Check if user with email already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email))
    .get();
  if (existingUser) {
    return c.json(
      createErrorResponse(
        "EMAIL_EXISTS",
        "A user with this email address already exists",
      ),
      400,
    );
  }

  const userId = crypto.randomUUID();
  const hashedPassword = await hashPassword(body.password);

  const newUser = {
    id: userId,
    name: body.name,
    email: body.email,
    passwordHash: hashedPassword,
    role: "user" as const,
    avatarUrl: null,
    status: "active" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(users).values(newUser);

  // Generate JWT Token & AES-256-GCM Double Encrypt
  const rawToken = await sign(
    {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days expiration
    },
    jwtSecret,
  );
  const token = await encryptToken(rawToken, jwtSecret);

  // Set HttpOnly Cookie
  const isProd =
    c.env.ENVIRONMENT === "production" || process.env.NODE_ENV === "production";
  setCookie(c, "auth_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  // Log Audit Event
  await logAudit(c.env.DB, c, {
    action: "REGISTER",
    entity: "users",
    entityId: newUser.id,
    userEmail: newUser.email,
    userRole: newUser.role,
  });

  const { passwordHash, ...userPayload } = newUser;

  return c.json(
    createSuccessResponse({
      token,
      user: userPayload,
    }),
    201,
  );
}

function cleanStr(val: unknown): string {
  if (typeof val !== "string") return "";
  return val.trim().replace(/^["']|["']$/g, "");
}

/**
 * Controller for User & Super Admin Login
 */
export async function loginController(c: Context<AppEnv>) {
  const jwtSecret = cleanStr(c.env.JWT_SECRET || process.env.JWT_SECRET || "dev_secret_key_change_in_production");
  const body = await c.req.json();

  const inputEmail = cleanStr(body.email).toLowerCase();
  const inputPassword = cleanStr(body.password);

  const envSuperAdminEmail = cleanStr(c.env.SUPER_ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL || c.env.INITIAL_ADMIN_EMAIL || "admin@yourdomain.com").toLowerCase();
  const envSuperAdminPassword = cleanStr(c.env.SUPER_ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD || c.env.INITIAL_ADMIN_PASSWORD || "YourSecurePassword123!");
  const envSuperAdminName = cleanStr(c.env.SUPER_ADMIN_NAME || process.env.SUPER_ADMIN_NAME || c.env.INITIAL_ADMIN_NAME || "Super Admin");

  const sampleAccounts = [
    {
      id: "usr_super_admin",
      name: envSuperAdminName,
      email: envSuperAdminEmail,
      password: envSuperAdminPassword,
      role: "super_admin" as const,
    },
    {
      id: "usr_admin_01",
      name: "Jane Manager",
      email: "manager@admin.com",
      password: "UserPassword123!",
      role: "admin" as const,
    },
    {
      id: "usr_user_01",
      name: "John Doe",
      email: "john@example.com",
      password: "UserPassword123!",
      role: "user" as const,
    },
  ];

  if (!c.env.DB) {
    const matched = sampleAccounts.find(
      (a) => a.email.toLowerCase() === inputEmail && a.password === inputPassword
    );

    if (matched) {
      const userPayload = {
        id: matched.id,
        name: matched.name,
        email: matched.email,
        role: matched.role,
        avatarUrl: null,
        status: "active" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const rawToken = await sign(
        {
          id: userPayload.id,
          email: userPayload.email,
          role: userPayload.role,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        },
        jwtSecret
      );
      const token = await encryptToken(rawToken, jwtSecret);

      const isProd = c.env.ENVIRONMENT === "production" || process.env.NODE_ENV === "production";
      setCookie(c, "auth_token", token, {
        httpOnly: true,
        secure: isProd,
        sameSite: "Lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return c.json(
        createSuccessResponse({
          token,
          user: userPayload,
        }),
        200
      );
    }

    return c.json(
      createErrorResponse("INVALID_CREDENTIALS", "Invalid email or password"),
      401
    );
  }

  const db = getDb(c.env.DB);

  if (
    envSuperAdminEmail &&
    envSuperAdminPassword &&
    inputEmail === envSuperAdminEmail &&
    inputPassword === envSuperAdminPassword
  ) {
    // Find or auto-provision Super Admin in D1
    let user = await db
      .select()
      .from(users)
      .where(eq(users.email, envSuperAdminEmail))
      .get();

    if (!user) {
      const adminId = crypto.randomUUID();
      const hashedPassword = await hashPassword(envSuperAdminPassword);

      const superAdminUser = {
        id: adminId,
        name: envSuperAdminName,
        email: envSuperAdminEmail,
        passwordHash: hashedPassword,
        role: "super_admin" as const,
        avatarUrl: null,
        status: "active" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(users).values(superAdminUser);

      await db.insert(superAdmins).values({
        id: crypto.randomUUID(),
        userId: adminId,
        canManageSettings: true,
        canManageAdmins: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      user = superAdminUser;
    } else {
      // Ensure super_admin role and password hash are up to date
      const isPassValid = (await verifyPassword(body.password, user.passwordHash || "")).isValid;
      if (!isPassValid || user.role !== "super_admin") {
        const newPbkdf2Hash = await hashPassword(envSuperAdminPassword);
        await db
          .update(users)
          .set({ passwordHash: newPbkdf2Hash, role: "super_admin", updatedAt: new Date() })
          .where(eq(users.id, user.id));
        user.role = "super_admin";
      }

      const existingSuperAdmin = await db
        .select()
        .from(superAdmins)
        .where(eq(superAdmins.userId, user.id))
        .get();

      if (!existingSuperAdmin) {
        await db.insert(superAdmins).values({
          id: crypto.randomUUID(),
          userId: user.id,
          canManageSettings: true,
          canManageAdmins: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (user.status !== "active") {
      return c.json(
        createErrorResponse(
          "ACCOUNT_SUSPENDED",
          "Your account has been suspended or pending activation",
        ),
        403,
      );
    }

    // Generate JWT Token & AES-256-GCM Double Encrypt
    const rawToken = await sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      },
      jwtSecret,
    );
    const token = await encryptToken(rawToken, jwtSecret);

    const isProd =
      c.env.ENVIRONMENT === "production" || process.env.NODE_ENV === "production";
    setCookie(c, "auth_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    await logAudit(c.env.DB, c, {
      action: "LOGIN_SUCCESS",
      entity: "auth",
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
    });

    const { passwordHash, ...userPayload } = user;
    return c.json(
      createSuccessResponse({
        token,
        user: userPayload,
      }),
      200,
    );
  }

  // Find user by email
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email))
    .get();
  if (!user || !user.passwordHash) {
    await logAudit(c.env.DB, c, {
      action: "LOGIN_FAILED",
      entity: "auth",
      userEmail: body.email,
      status: "FAILED",
      details: "Invalid credentials",
    });
    return c.json(
      createErrorResponse("INVALID_CREDENTIALS", "Invalid email or password"),
      401,
    );
  }

  // Verify password (supports PBKDF2 & legacy SHA-256)
  const verifyResult = await verifyPassword(body.password, user.passwordHash);
  if (!verifyResult.isValid) {
    await logAudit(c.env.DB, c, {
      action: "LOGIN_FAILED",
      entity: "auth",
      userEmail: body.email,
      status: "FAILED",
      details: "Invalid password",
    });
    return c.json(
      createErrorResponse("INVALID_CREDENTIALS", "Invalid email or password"),
      401,
    );
  }

  // Transparent Password Upgrade: if user used legacy SHA-256 hash, upgrade hash to PBKDF2 in D1
  if (verifyResult.isLegacy) {
    try {
      const newPbkdf2Hash = await hashPassword(body.password);
      await db
        .update(users)
        .set({ passwordHash: newPbkdf2Hash, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    } catch (upgradeErr) {
      console.error(
        "Failed to transparently upgrade password hash:",
        upgradeErr,
      );
    }
  }

  if (user.status !== "active") {
    return c.json(
      createErrorResponse(
        "ACCOUNT_SUSPENDED",
        "Your account has been suspended or pending activation",
      ),
      403,
    );
  }

  // Generate JWT Token & AES-256-GCM Double Encrypt
  const rawToken = await sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days expiration
    },
    jwtSecret,
  );
  const token = await encryptToken(rawToken, jwtSecret);

  // Set HttpOnly Cookie
  const isProd =
    c.env.ENVIRONMENT === "production" || process.env.NODE_ENV === "production";
  setCookie(c, "auth_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  // Log Audit Event
  await logAudit(c.env.DB, c, {
    action: "LOGIN_SUCCESS",
    entity: "auth",
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
  });

  const { passwordHash, ...userPayload } = user;

  return c.json(
    createSuccessResponse({
      token,
      user: userPayload,
    }),
    200,
  );
}

/**
 * Controller to fetch the currently authenticated user identity (/api/auth/me)
 */
export async function meController(c: Context<AppEnv>) {
  const userId = c.get("userId");
  if (!userId) {
    return c.json(
      createErrorResponse("UNAUTHORIZED", "Authentication token required"),
      401,
    );
  }

  if (!c.env.DB) {
    const envSuperAdminEmail = c.env.SUPER_ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL || "admin@yourdomain.com";
    const envSuperAdminName = c.env.SUPER_ADMIN_NAME || process.env.SUPER_ADMIN_NAME || "Super Admin";
    return c.json(
      createSuccessResponse({
        user: {
          id: userId,
          name: envSuperAdminName,
          email: envSuperAdminEmail,
          role: "super_admin" as const,
          avatarUrl: null,
          status: "active" as const,
        },
      }),
      200,
    );
  }

  const db = getDb(c.env.DB);
  const user = await db.select().from(users).where(eq(users.id, userId)).get();

  if (!user) {
    return c.json(createErrorResponse("UNAUTHORIZED", "User not found"), 401);
  }

  if (user.status !== "active") {
    return c.json(
      createErrorResponse(
        "ACCOUNT_SUSPENDED",
        "Your account has been suspended",
      ),
      403,
    );
  }

  const { passwordHash, ...userPayload } = user;

  return c.json(
    createSuccessResponse({
      user: userPayload,
    }),
    200,
  );
}

/**
 * Controller to logout and clear session cookies
 */
export async function logoutController(c: Context<AppEnv>) {
  deleteCookie(c, "auth_token", { path: "/" });
  return c.json(
    createSuccessResponse({
      message: "Logged out successfully",
    }),
    200,
  );
}

/**
 * Controller for Google OAuth Authentication
 */
export async function googleLoginController(c: Context<AppEnv>) {
  if (!c.env.DB) {
    return c.json(createErrorResponse("DB_MISSING", "Database binding missing"), 500);
  }

  const jwtSecret = c.env.JWT_SECRET;
  if (!jwtSecret) {
    return c.json(
      createErrorResponse("SERVER_CONFIG_ERROR", "Server authentication secret is missing"),
      500
    );
  }

  const body = await c.req.json();
  const db = getDb(c.env.DB);
  const token = body.idToken || body.credential;
  const accessToken = body.accessToken || body.access_token;

  let googleEmail = body.email;
  let googleName = body.name || "Google User";
  let avatarUrl = body.avatarUrl || null;

  if (accessToken && accessToken !== "mock_dev_access_token") {
    try {
      const gRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (gRes.ok) {
        const gData = (await gRes.json()) as any;
        if (gData.email) {
          googleEmail = gData.email;
          googleName = gData.name || googleName;
          avatarUrl = gData.picture || avatarUrl;
        }
      }
    } catch (err) {
      console.error("Failed to verify Google access token:", err);
    }
  } else if (token && token !== "mock_dev_google_token") {
    try {
      const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
      if (gRes.ok) {
        const gData = (await gRes.json()) as any;
        if (gData.email) {
          googleEmail = gData.email;
          googleName = gData.name || googleName;
          avatarUrl = gData.picture || avatarUrl;
        }
      }
    } catch (err) {
      console.error("Failed to verify Google token:", err);
    }
  }

  if (!googleEmail) {
    return c.json(
      createErrorResponse("GOOGLE_AUTH_FAILED", "Invalid Google authentication token or missing email"),
      400
    );
  }

  // Check if user already exists
  let user = await db.select().from(users).where(eq(users.email, googleEmail)).get();

  const envSuperAdminEmail = c.env.SUPER_ADMIN_EMAIL || c.env.INITIAL_ADMIN_EMAIL;
  const isSuperAdminEmail = Boolean(
    envSuperAdminEmail && googleEmail.toLowerCase() === envSuperAdminEmail.toLowerCase()
  );

  if (!user) {
    const newUserId = crypto.randomUUID();
    const role = isSuperAdminEmail ? ("super_admin" as const) : ("user" as const);

    const newUser = {
      id: newUserId,
      name: googleName,
      email: googleEmail,
      passwordHash: "",
      role,
      avatarUrl,
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(users).values(newUser);

    if (role === "super_admin") {
      await db.insert(superAdmins).values({
        id: crypto.randomUUID(),
        userId: newUserId,
        canManageSettings: true,
        canManageAdmins: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    user = newUser;
  } else if (isSuperAdminEmail) {
    if (user.role !== "super_admin") {
      await db.update(users).set({ role: "super_admin", updatedAt: new Date() }).where(eq(users.id, user.id));
      user.role = "super_admin";
    }

    const existingSuperAdmin = await db
      .select()
      .from(superAdmins)
      .where(eq(superAdmins.userId, user.id))
      .get();

    if (!existingSuperAdmin) {
      await db.insert(superAdmins).values({
        id: crypto.randomUUID(),
        userId: user.id,
        canManageSettings: true,
        canManageAdmins: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  if (user.status !== "active") {
    return c.json(
      createErrorResponse("ACCOUNT_SUSPENDED", "Your account has been suspended"),
      403
    );
  }

  // Issue JWT Token & AES-256-GCM Double Encrypt
  const rawJwtToken = await sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    },
    jwtSecret
  );
  const jwtToken = await encryptToken(rawJwtToken, jwtSecret);

  const isProd = c.env.ENVIRONMENT === "production" || process.env.NODE_ENV === "production";
  setCookie(c, "auth_token", jwtToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  await logAudit(c.env.DB, c, {
    action: "GOOGLE_LOGIN_SUCCESS",
    entity: "auth",
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
  });

  const { passwordHash, ...userPayload } = user;
  return c.json(
    createSuccessResponse({
      token: jwtToken,
      user: userPayload,
    }),
    200
  );
}

/**
 * Controller to fetch public app configuration encrypted via AES-256-GCM
 */
export async function getPublicConfigController(c: Context<AppEnv>) {
  let settings: any = null;

  if (c.env?.DB) {
    try {
      const db = getDb(c.env.DB);
      settings = await db.select().from(siteSettings).where(eq(siteSettings.id, "default")).get();
    } catch {
      settings = null;
    }
  }

  if (!settings) {
    settings = {
      id: "default",
      siteName: "Restaurant Menu",
      siteDescription: "Modern restaurant menu application",
      siteUrl: null,
      siteLogoUrl: null,
      siteFaviconUrl: null,
      supportEmail: null,
      telegramToken: null,
      telegramGroupId: null,
      telegramEnabled: false,
      resendApiKey: null,
      mailFrom: null,
      mailFromName: "System Notification",
      resendEnabled: false,
      notificationToken: null,
      vapidPublicKey: null,
      googleClientId: c.env?.GOOGLE_CLIENT_ID || null,
      googleClientSecret: null,
      googleAuthEnabled: false,
      allowRegistration: true,
      requireEmailVerification: false,
      maintenanceMode: false,
      maintenanceMessage: "We are currently under scheduled maintenance. Please check back soon.",
      googleAnalyticsId: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const publicConfig = {
    siteName: settings.siteName || "Restaurant Menu",
    siteDescription: settings.siteDescription || "",
    siteUrl: settings.siteUrl || "",
    googleClientId: settings.googleClientId || "",
    googleAuthEnabled: Boolean(settings.googleAuthEnabled),
    vapidPublicKey: settings.vapidPublicKey || "",
    allowRegistration: Boolean(settings.allowRegistration),
    maintenanceMode: Boolean(settings.maintenanceMode),
    maintenanceMessage: settings.maintenanceMessage || "",
  };

  const encryptedPayload = await encryptConfigPayload(publicConfig);

  return c.json(
    createSuccessResponse({
      payload: encryptedPayload,
    }),
    200
  );
}

/**
 * Controller to update current authenticated user profile (/api/auth/me)
 * BACKEND SECURITY RULE: User role CANNOT be modified via profile update.
 * Role updates are strictly reserved for Super Admin configuration.
 */
export async function updateProfileController(c: Context<AppEnv>) {
  if (!c.env.DB) {
    return c.json(
      createErrorResponse("DB_MISSING", "Database binding missing"),
      500,
    );
  }

  const userId = c.get("userId");
  if (!userId) {
    return c.json(
      createErrorResponse("UNAUTHORIZED", "Authentication token required"),
      401,
    );
  }

  const db = getDb(c.env.DB);
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!existingUser) {
    return c.json(createErrorResponse("UNAUTHORIZED", "User not found"), 401);
  }

  if (existingUser.status !== "active") {
    return c.json(
      createErrorResponse(
        "ACCOUNT_SUSPENDED",
        "Your account has been suspended",
      ),
      403,
    );
  }

  const body = await c.req.json();

  const updateFields: Record<string, any> = {
    updatedAt: new Date(),
  };

  // Update name if provided and valid
  if (body.name !== undefined && body.name !== null && typeof body.name === "string") {
    const trimmedName = body.name.trim();
    if (trimmedName.length > 0) {
      updateFields.name = trimmedName;
    }
  }

  // Update avatarUrl if provided
  if (body.avatarUrl !== undefined) {
    updateFields.avatarUrl = body.avatarUrl && typeof body.avatarUrl === "string" && body.avatarUrl.trim().length > 0
      ? body.avatarUrl.trim()
      : null;
  }

  // Update password if provided (minimum 6 characters)
  if (body.password && typeof body.password === "string" && body.password.trim().length >= 6) {
    updateFields.passwordHash = await hashPassword(body.password.trim());
  }

  // SECURITY ENFORCEMENT: 'role' is explicitly NOT included in updateFields.
  // Regular users cannot update their role via self-service profile updates.

  await db.update(users).set(updateFields).where(eq(users.id, userId));

  const updatedUser = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!updatedUser) {
    return c.json(
      createErrorResponse("NOT_FOUND", "User not found after update"),
      404,
    );
  }

  await logAudit(c.env.DB, c, {
    action: "UPDATE_PROFILE",
    entity: "users",
    entityId: userId,
    userId: userId,
    userEmail: updatedUser.email,
    userRole: updatedUser.role,
    details: `Updated name: ${updatedUser.name}, avatarUrl: ${updatedUser.avatarUrl || 'none'}, passwordChanged: ${Boolean(body.password)}`,
  });

  const { passwordHash, ...userPayload } = updatedUser;

  return c.json(
    createSuccessResponse({
      user: userPayload,
    }),
    200,
  );
}


