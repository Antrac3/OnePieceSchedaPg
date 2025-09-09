import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
const supabase = getSupabase();
import type { Profile } from "@shared/api";

function isRefreshTokenError(err: any) {
  try {
    const msg = String(err?.message || err || "").toLowerCase();
    return msg.includes("refresh token") || msg.includes("invalid refresh");
  } catch (e) {
    return false;
  }
}

export function useSessionProfile() {
  const [sessionLoading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!isSupabaseConfigured()) {
        if (import.meta.env.DEV)
          console.debug("[useSessionProfile] supabase not configured");
        setLoading(false);
        return;
      }

      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (import.meta.env.DEV)
          console.debug(
            "[useSessionProfile] initial session:",
            sessionData,
            sessionError ? JSON.parse(JSON.stringify(sessionError)) : null,
          );

        // If Supabase reports an issue with refresh token, sign out to clear stale tokens
        if (sessionError && isRefreshTokenError(sessionError)) {
          // eslint-disable-next-line no-console
          console.warn(
            "[useSessionProfile] invalid refresh token detected, signing out to clear state",
            JSON.parse(JSON.stringify(sessionError)),
          );
          try {
            await supabase.auth.signOut();
          } catch (sErr) {
            // ignore signOut failures
          }
          if (!mounted) return;
          setUserId(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const uid = sessionData?.session?.user?.id ?? null;
        if (!mounted) return;
        setUserId(uid);

        if (uid) {
          // try fetching profile with retries to avoid race conditions immediately after auth state changes
          const fetchProfile = async (attempt = 0): Promise<void> => {
            try {
              const { data, error } = await supabase
                .from("profiles")
                .select("id,email,role,created_at")
                .eq("id", uid)
                .maybeSingle();

              if (import.meta.env.DEV)
                console.debug("[useSessionProfile] profile fetch result:", {
                  data,
                  error: error ? JSON.parse(JSON.stringify(error)) : null,
                  attempt,
                });
              if (!mounted) return;

              if (data) {
                setProfile(data as Profile);
              } else if (error && attempt < 3) {
                // transient error — retry after a short delay
                // eslint-disable-next-line no-console
                console.warn(
                  "[useSessionProfile] profile fetch error, retrying:",
                  JSON.parse(JSON.stringify(error)),
                  "attempt",
                  attempt + 1,
                );
                setTimeout(
                  () => fetchProfile(attempt + 1),
                  250 * (attempt + 1),
                );
              } else if (error) {
                // final failure
                // eslint-disable-next-line no-console
                console.error(
                  "[useSessionProfile] profile fetch final error:",
                  JSON.parse(JSON.stringify(error)),
                );
                setProfile(null);
              }
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error(
                "[useSessionProfile] unexpected error when fetching profile:",
                e,
              );
              if (!mounted) return;
              if (isRefreshTokenError(e)) {
                try {
                  await supabase.auth.signOut();
                } catch (_) {}
                setUserId(null);
                setProfile(null);
              }
            }
          };
          await fetchProfile(0);
        }
      } catch (err) {
        // log any unexpected errors
        // eslint-disable-next-line no-console
        console.error("[useSessionProfile] init error:", err);
        if (isRefreshTokenError(err)) {
          try {
            await supabase.auth.signOut();
          } catch (_) {}
          setUserId(null);
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    }

    init();

    // subscribe to auth changes only if supabase is configured
    let sub: any = null;
    if (isSupabaseConfigured() && supabase && (supabase as any).auth) {
      sub = supabase.auth.onAuthStateChange((event: any, sess: any) => {
        if (import.meta.env.DEV)
          console.debug("[useSessionProfile] auth state change:", event, sess);

        // handle token refresh failures proactively
        if (
          event === "TOKEN_REFRESH_FAILED" ||
          event === "SIGNED_OUT" ||
          event === "USER_DELETED"
        ) {
          setUserId(null);
          setProfile(null);
          return;
        }

        const uid = sess?.user?.id ?? null;
        setUserId(uid);

        if (uid) {
          supabase
            .from("profiles")
            .select("id,email,role,created_at")
            .eq("id", uid)
            .maybeSingle()
            .then(({ data, error }: any) => {
              if (import.meta.env.DEV)
                console.debug(
                  "[useSessionProfile] profile fetch on auth change:",
                  { data, error },
                );
              if (data) setProfile(data as Profile);
              if (error) {
                // eslint-disable-next-line no-console
                console.error(
                  "[useSessionProfile] profile fetch error:",
                  error,
                );
                if (isRefreshTokenError(error)) {
                  // clear state if refresh token is invalid
                  supabase.auth.signOut().catch(() => {});
                  setUserId(null);
                  setProfile(null);
                }
              }
            });
        } else {
          setProfile(null);
        }
      });
    }

    return () => {
      mounted = false;
      if (
        sub &&
        sub.subscription &&
        typeof sub.subscription.unsubscribe === "function"
      ) {
        sub.subscription.unsubscribe();
      }
    };
  }, []);

  return {
    sessionLoading,
    userId,
    profile,
    role: profile?.role ?? (userId ? "player" : null),
    isAuthenticated: Boolean(userId),
  } as const;
}
