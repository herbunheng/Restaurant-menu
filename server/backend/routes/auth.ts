import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { LoginSchema, RegisterSchema, UpdateProfileSchema, AuthResponseSchema, ApiResponseSchema, UserSchema } from '@restaurant-menu/shared';
import { z } from 'zod';
import { registerController, loginController, meController, updateProfileController, logoutController, googleLoginController, getPublicConfigController } from '../controllers/auth.controller';
import { sensitiveRateLimiter } from '../middleware/rate-limit';
import { userAuth } from '../middleware/super-admin-auth';
import type { AppEnv } from '../types';

export const authRouter = new OpenAPIHono<AppEnv>();

// Apply sensitive rate limiter to auth endpoints
authRouter.use('/login', sensitiveRateLimiter);
authRouter.use('/register', sensitiveRateLimiter);
authRouter.use('/google', sensitiveRateLimiter);

// Protect /me route with authentication guard
authRouter.use('/me', userAuth);


// POST /api/auth/register - User Registration
const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  summary: 'User Registration',
  description: 'Register a new user account and receive authentication cookie/token.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(AuthResponseSchema),
        },
      },
      description: 'Registered user and token response',
    },
    400: {
      description: 'User registration error',
    },
  },
});

// POST /api/auth/login - Login (Super Admin & User)
const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  summary: 'User & Super Admin Login',
  description: 'Authenticates credentials and sets an HttpOnly cookie for accessing protected endpoints.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(AuthResponseSchema),
        },
      },
      description: 'Authenticated token payload',
    },
    401: {
      description: 'Invalid credentials error',
    },
  },
});

// GET /api/auth/me - Fetch Currently Authenticated User Session
const meRoute = createRoute({
  method: 'get',
  path: '/me',
  summary: 'Fetch Current Authenticated User Identity',
  description: 'Validates current session cookie or token and returns user profile data.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(z.object({ user: UserSchema.omit({ passwordHash: true }) })),
        },
      },
      description: 'Authenticated user profile data',
    },
    401: {
      description: 'Unauthenticated error',
    },
  },
});

// POST /api/auth/logout - Logout & Clear Session Cookie
const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  summary: 'User Logout',
  description: 'Clears the HttpOnly authentication cookie and invalidates client session.',
  responses: {
    200: {
      description: 'Logged out successfully',
    },
  },
});

// POST /api/auth/google - Google OAuth Single Sign-On
const googleRoute = createRoute({
  method: 'post',
  path: '/google',
  summary: 'Google OAuth Authentication',
  description: 'Authenticates a user via Google ID Token or credential, sets cookie, and returns user identity.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(AuthResponseSchema),
        },
      },
      description: 'Authenticated Google user response',
    },
    400: {
      description: 'Google authentication error',
    },
  },
});

// GET /api/auth/public-config - Encrypted Public System Settings
const publicConfigRoute = createRoute({
  method: 'get',
  path: '/public-config',
  summary: 'Fetch Encrypted Public System Configuration',
  description: 'Returns AES-256-GCM encrypted public configuration including Google OAuth Client ID, VAPID Keys, and registration status.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(z.object({ payload: z.string() })),
        },
      },
      description: 'Encrypted public configuration payload string',
    },
  },
});

// PUT /api/auth/me - Update User Profile
const updateProfileRoute = createRoute({
  method: 'put',
  path: '/me',
  summary: 'Update Current User Profile',
  description: 'Updates profile fields (name, avatar, password). Role updates are ignored and protected on backend.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateProfileSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(z.object({ user: UserSchema.omit({ passwordHash: true }) })),
        },
      },
      description: 'Updated user profile data',
    },
    400: {
      description: 'Profile update validation error',
    },
    401: {
      description: 'Unauthenticated error',
    },
  },
});

// Attach Controllers
authRouter.openapi(registerRoute, registerController as any);
authRouter.openapi(loginRoute, loginController as any);
authRouter.openapi(meRoute, meController as any);
authRouter.openapi(updateProfileRoute, updateProfileController as any);
authRouter.openapi(logoutRoute, logoutController as any);
authRouter.openapi(googleRoute, googleLoginController as any);
authRouter.openapi(publicConfigRoute, getPublicConfigController as any);



