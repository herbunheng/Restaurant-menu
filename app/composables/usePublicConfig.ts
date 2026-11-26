export interface PublicAppConfig {
  siteName: string;
  siteDescription?: string;
  siteUrl?: string;
  googleClientId?: string;
  googleAuthEnabled?: boolean;
  vapidPublicKey?: string;
  allowRegistration?: boolean;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
}

const CONFIG_SECRET = "app_public_config_secret_key_2026";

/**
 * Decrypts an AES-256-GCM encrypted payload string (<iv_hex>:<ciphertext_hex>)
 * using the Web Crypto API on client or SSR.
 */
async function decryptConfigPayload<T = any>(encryptedStr: string): Promise<T> {
  const parts = encryptedStr.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted config payload format");
  }

  const ivHex = parts[0];
  const cipherHex = parts[1];

  const iv = new Uint8Array(
    ivHex?.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [],
  );
  const cipherBytes = new Uint8Array(
    cipherHex?.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [],
  );

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(CONFIG_SECRET),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipherBytes,
  );

  const decoder = new TextDecoder();
  const jsonStr = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonStr) as T;
}

export function usePublicConfig() {
  const { $api } = useApi();
  const publicConfig = useState<PublicAppConfig | null>(
    "public_app_config",
    () => null,
  );
  const isLoading = useState<boolean>("public_app_config_loading", () => false);

  /**
   * Fetches the encrypted public config from backend API and decrypts it on the client
   */
  async function fetchPublicConfig(): Promise<PublicAppConfig | null> {
    if (publicConfig.value) {
      return publicConfig.value;
    }

    isLoading.value = true;
    try {
      const response = await $api<{ payload: string }>(
        "/api/auth/public-config",
        {
          method: "GET",
        },
      );

      if (response && response.payload) {
        const decrypted = await decryptConfigPayload<PublicAppConfig>(
          response.payload,
        );
        publicConfig.value = decrypted;
        return decrypted;
      }
    } catch (err) {
      console.error(
        "Failed to fetch/decrypt public config from API backend:",
        err,
      );
    } finally {
      isLoading.value = false;
    }

    return publicConfig.value;
  }

  return {
    publicConfig,
    isLoading,
    fetchPublicConfig,
  };
}
