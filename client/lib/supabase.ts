import { createClient } from "@supabase/supabase-js";

// Read env at module init
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? undefined;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? undefined;

// Debug: log whether vite exposed the variables (only for development)
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.debug("[supabase] VITE_SUPABASE_URL:", supabaseUrl ? "(present)" : "(missing)");
  // eslint-disable-next-line no-console
  console.debug("[supabase] VITE_SUPABASE_ANON_KEY:", supabaseAnonKey ? "(present)" : "(missing)");
}

// Provide a safe storage wrapper that falls back to memory when localStorage/cookies are unavailable
function createSafeStorage() {
  let inMemory = new Map<string, string>();
  const canAccess = () => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return false;
      const testKey = "__supabase_storage_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  };

  if (canAccess()) {
    return {
      getItem: (key: string) => window.localStorage.getItem(key),
      setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
      removeItem: (key: string) => window.localStorage.removeItem(key),
      clear: () => window.localStorage.clear(),
    } as Storage;
  }

  // fallback in-memory storage
  return ({
    getItem: (key: string) => (inMemory.has(key) ? String(inMemory.get(key)) : null),
    setItem: (key: string, value: string) => inMemory.set(key, value),
    removeItem: (key: string) => inMemory.delete(key),
    clear: () => (inMemory = new Map()),
  } as unknown) as Storage;
}

// Guard against multiple declarations (HMR / double-eval). Re-use global instance if present.
const _global = globalThis as any;
if (!_global.__supabaseClient) {
  _global.__supabaseClient =
    supabaseUrl && supabaseAnonKey
      ? createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            detectSessionInUrl: false,
            storage: createSafeStorage(),
          },
        })
      : (null as unknown as ReturnType<typeof createClient>);
}

// provide accessor to avoid importing the identifier 'supabase' directly in multiple modules
export function getSupabase() {
  return _global.__supabaseClient as ReturnType<typeof createClient>;
}

export type ProfileRole = "player" | "master";

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
