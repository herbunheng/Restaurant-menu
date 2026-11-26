import type { UserRole, AuthUser } from "@restaurant-menu/shared";

export function useAuth() {
  const { $api } = useApi();
  const token = useCookie<string | null>("auth_token", {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
    sameSite: "lax",
  });

  const user = useState<AuthUser | null>("auth_user", () => null);
  const isLoading = useState<boolean>("auth_loading", () => false);

  const isLoggedIn = computed(() => Boolean(user.value));
  const isSuperAdmin = computed(() => user.value?.role === "super_admin");

  /**
   * Hydrates currently authenticated user profile from /api/auth/me
   */
  async function fetchMe() {
    isLoading.value = true;
    try {
      const response = await $api<{ user: AuthUser }>("/api/auth/me", {
        method: "GET",
      });
      user.value = response.user;
      return response.user;
    } catch (err) {
      user.value = null;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Super Admin & User Login
   */
  async function login(email: string, password: string) {
    isLoading.value = true;
    try {
      const response = await $api<{ token: string; user: AuthUser }>(
        "/api/auth/login",
        {
          method: "POST",
          body: { email, password },
        },
      );

      if (response.token) {
        token.value = response.token;
      }
      user.value = response.user;
      return response;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Google Single Sign-On Authentication
   */
  async function loginWithGoogle(payload: {
    idToken?: string;
    accessToken?: string;
    credential?: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
  }) {
    isLoading.value = true;
    try {
      const response = await $api<{ token: string; user: AuthUser }>(
        "/api/auth/google",
        {
          method: "POST",
          body: payload,
        },
      );

      if (response.token) {
        token.value = response.token;
      }
      user.value = response.user;
      return response;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Updates currently authenticated user profile
   */
  async function updateProfile(payload: {
    name?: string;
    avatarUrl?: string;
    password?: string;
  }) {
    isLoading.value = true;
    try {
      const response = await $api<{ user: AuthUser }>("/api/auth/me", {
        method: "PUT",
        body: payload,
      });
      if (response.user) {
        user.value = response.user;
      }
      return response.user;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Logout user and clear session
   */
  async function logout() {
    try {
      await $api("/api/auth/logout", { method: "POST" });
    } catch (err) {
      // Ignore errors on logout request
    } finally {
      token.value = null;
      user.value = null;
      return navigateTo("/auth/login");
    }
  }

  return {
    token,
    user,
    isLoading,
    isLoggedIn,
    isSuperAdmin,
    fetchMe,
    login,
    loginWithGoogle,
    updateProfile,
    logout,
  };
}

