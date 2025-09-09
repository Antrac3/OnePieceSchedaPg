import type { CharacterSheet } from "@shared/api";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
const supabase = getSupabase();

function serializeError(e: any) {
  try {
    return typeof e === 'object' ? JSON.stringify(e, Object.getOwnPropertyNames(e), 2) : String(e);
  } catch (err) {
    return String(e);
  }
}

export async function fetchCharacterByUser(userId: string) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
  }
  try {
    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[character.api] fetchCharacterByUser error:", serializeError(error));
      throw error;
    }
    if (!data) return null;

    // reconstruct health object from flat columns
    const health: any = {
      max: (data as any).hp_max ?? 0,
      current: (data as any).hp_current ?? 0,
      wounds: (data as any).hp_wounds ?? 0,
      malus_notes: (data as any).hp_malus_notes ?? "",
      total_damage: (data as any).hp_total_damage ?? 0,
    };
    for (let i = 1; i <= 6; i++) {
      health[`hp_bonus_l${i}`] = (data as any)[`hp_bonus_l${i}`] ?? 0;
      health[`hp_dmg_l${i}`] = (data as any)[`hp_dmg_l${i}`] ?? 0;
    }

    const out = { ...(data as any), health } as CharacterSheet;
    // normalize affinities: prefer points.affinities if present
    (out as any).affinities = (data as any)?.points?.affinities ?? (data as any)?.affinities ?? [];
    return out;
  } catch (err) {
    // network or other error calling Supabase client - attempt server-side fallback
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token ?? null;
      const res = await fetch('/api/character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => null);
        throw new Error(`Server fallback failed: ${res.status} ${body ?? ''}`);
      }
      const json = await res.json();
      const row = json?.data ?? null;
      if (!row) return null;
      const health: any = {
        max: row.hp_max ?? 0,
        current: row.hp_current ?? 0,
        wounds: row.hp_wounds ?? 0,
        malus_notes: row.hp_malus_notes ?? "",
        total_damage: row.hp_total_damage ?? 0,
      };
      for (let i = 1; i <= 6; i++) {
        health[`hp_bonus_l${i}`] = row[`hp_bonus_l${i}`] ?? 0;
        health[`hp_dmg_l${i}`] = row[`hp_dmg_l${i}`] ?? 0;
      }
      const out = { ...row, health } as CharacterSheet;
      out.affinities = row?.points?.affinities ?? row?.affinities ?? [];
      return out;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[character.api] fetchCharacterByUser error:', serializeError(e));
      throw e;
    }
  }
  const health: any = {
    max: (data as any).hp_max ?? 0,
    current: (data as any).hp_current ?? 0,
    wounds: (data as any).hp_wounds ?? 0,
    malus_notes: (data as any).hp_malus_notes ?? "",
    total_damage: (data as any).hp_total_damage ?? 0,
  };
  for (let i = 1; i <= 6; i++) {
    health[`hp_bonus_l${i}`] = (data as any)[`hp_bonus_l${i}`] ?? 0;
    health[`hp_dmg_l${i}`] = (data as any)[`hp_dmg_l${i}`] ?? 0;
  }

  const out = { ...(data as any), health } as CharacterSheet;
  // normalize affinities: prefer points.affinities if present
  (out as any).affinities = (data as any)?.points?.affinities ?? (data as any)?.affinities ?? [];
  return out;
}

export async function fetchAllCharacters() {
  // Prefer server-side admin endpoint which enforces master role and bypasses RLS using service_role
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token ?? null;
    const res = await fetch('/api/admin/characters', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Admin fetch failed: ${res.status} ${body}`);
    }
    const json = await res.json();
    const rows = json?.data ?? [];
    return (rows as any[]).map((row) => {
      const health: any = {
        max: row.hp_max ?? 0,
        current: row.hp_current ?? 0,
        wounds: row.hp_wounds ?? 0,
        malus_notes: row.hp_malus_notes ?? "",
        total_damage: row.hp_total_damage ?? 0,
      };
      for (let i = 1; i <= 6; i++) {
        health[`hp_bonus_l${i}`] = row[`hp_bonus_l${i}`] ?? 0;
        health[`hp_dmg_l${i}`] = row[`hp_dmg_l${i}`] ?? 0;
      }
      const outRow: any = { ...row, health };
      outRow.affinities = row?.points?.affinities ?? row?.affinities ?? [];
      return outRow as CharacterSheet & { profiles?: any };
    });
  } catch (e) {
    // fallback to client-side query (may be blocked by RLS)
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase not configured");
    }
    const { data, error } = await supabase
      .from("characters")
      .select("*, profiles:profiles(id,email,role)")
      .order("updated_at", { ascending: false });
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[character.api] fetchAllCharacters error:", serializeError(error));
      throw error;
    }
    if (!data) return [];
    return (data as any[]).map((row) => {
      const health: any = {
        max: row.hp_max ?? 0,
        current: row.hp_current ?? 0,
        wounds: row.hp_wounds ?? 0,
        malus_notes: row.hp_malus_notes ?? "",
        total_damage: row.hp_total_damage ?? 0,
      };
      for (let i = 1; i <= 6; i++) {
        health[`hp_bonus_l${i}`] = row[`hp_bonus_l${i}`] ?? 0;
        health[`hp_dmg_l${i}`] = row[`hp_dmg_l${i}`] ?? 0;
      }
      const outRow: any = { ...row, health };
      outRow.affinities = row?.points?.affinities ?? row?.affinities ?? [];
      return outRow as CharacterSheet & { profiles?: any };
    });
  }
}

export async function upsertCharacter(sheet: CharacterSheet) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
  }
  // Ensure we have authenticated user's id for RLS checks
  try {
    const sessionRes = await supabase.auth.getSession();
    const uid = sessionRes?.data?.session?.user?.id ?? null;
    const payload: any = { ...sheet, updated_at: new Date().toISOString() };
    if (!payload.user_id && uid) payload.user_id = uid;

    // Map health object into dedicated DB columns (unified names)
    if (payload.health) {
      const h = payload.health;
      // copy per-level fields
      for (let i = 1; i <= 6; i++) {
        const bKey = `hp_bonus_l${i}`;
        const dKey = `hp_dmg_l${i}`;
        payload[bKey] = Number((h as any)[bKey] ?? 0);
        payload[dKey] = Number((h as any)[dKey] ?? 0);
      }

      // compute hp_max based on base distribution + level progression + bonuses
      const baseArr = [5, 4, 3, 2, 1, 0];
      const level = (payload.status && payload.status.level) || 1;
      const levelAdd = Math.max(0, level - 1);
      let computedMax = 0;
      for (let i = 0; i < 6; i++) {
        const baseShown = baseArr[i] + (i < 5 ? levelAdd : 0);
        const bonus = Number(payload[`hp_bonus_l${i + 1}`] ?? 0);
        computedMax += baseShown + bonus;
      }

      const computedTotalDamage = [1, 2, 3, 4, 5, 6].reduce((acc, i) => acc + Number(payload[`hp_dmg_l${i}`] ?? 0), 0);

      payload.hp_max = Number(h.max ?? computedMax);
      // Always store computed total damage derived from per-level allocations to avoid inconsistencies
      payload.hp_total_damage = Number(computedTotalDamage);
      // Compute current HP from computed values unless explicitly provided
      payload.hp_current = Number(typeof h.current !== 'undefined' ? h.current : Math.max(0, (payload.hp_max ?? computedMax) - computedTotalDamage));
      payload.hp_wounds = h.wounds ?? null;
      payload.hp_malus_notes = h.malus_notes ?? null;

      // remove nested health to store flat columns
      delete payload.health;
    }

    // Move affinities into points if present (avoid upserting unknown columns)
    if (payload.affinities) {
      try {
        payload.points = payload.points || {};
        // keep existing points.affinities but overwrite with latest
        payload.points.affinities = payload.affinities;
      } catch (e) {
        // ignore
      }
      delete payload.affinities;
    }

    // ensure profile exists to satisfy foreign key constraint
    if (payload.user_id) {
      try {
        const { data: profData, error: profErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", payload.user_id)
          .maybeSingle();
        if (profErr) {
          // eslint-disable-next-line no-console
          console.error("[character.api] profile existence check error:", serializeError(profErr));
          throw profErr;
        }
        if (!profData) {
          // Only attempt client-side insert if session uid matches payload user_id
          const email = sessionRes?.data?.session?.user?.email ?? null;
          if (uid && payload.user_id && uid === payload.user_id) {
            const { data: insData, error: insErr } = await (supabase as any)
              .from("profiles")
              .insert({ id: payload.user_id, email, role: "player" });
            if (insErr) {
              // eslint-disable-next-line no-console
              console.error("[character.api] insert profile error:", serializeError(insErr));
              throw insErr;
            }
          } else {
            // cannot create profile from client - throw clear error so caller can handle
            const err = new Error("Cannot create profile: authenticated user does not match payload user_id");
            // eslint-disable-next-line no-console
            console.error("[character.api] profile creation aborted:", err);
            throw err;
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[character.api] ensure profile error:", serializeError(e));
        throw e;
      }
    }

    const { data, error } = await supabase
      .from("characters")
      .upsert(payload)
      .select()
      .single();
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[character.api] upsertCharacter error:", serializeError(error), "payload:", JSON.stringify(payload));
      throw error;
    }

    // reconstruct health object before returning to keep client shape consistent
    if (data) {
      const rec: any = data;
      const health: any = {
        max: rec.hp_max ?? 0,
        current: rec.hp_current ?? 0,
        wounds: rec.hp_wounds ?? 0,
        malus_notes: rec.hp_malus_notes ?? "",
        total_damage: rec.hp_total_damage ?? 0,
      };
      for (let i = 1; i <= 6; i++) {
        health[`hp_bonus_l${i}`] = rec[`hp_bonus_l${i}`] ?? 0;
        health[`hp_dmg_l${i}`] = rec[`hp_dmg_l${i}`] ?? 0;
      }
      const out: any = { ...(rec as any), health } as CharacterSheet;
      out.affinities = rec?.points?.affinities ?? rec?.affinities ?? [];
      return out;
    }

    return data as CharacterSheet;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[character.api] upsertCharacter unexpected error:", serializeError(err));
    throw err;
  }
}
