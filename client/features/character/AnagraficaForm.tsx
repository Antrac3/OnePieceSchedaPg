import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
const supabase = getSupabase();

export default function AnagraficaForm({
  value,
  onChange,
  userId,
}: {
  value: any;
  onChange: (v: any) => void;
  userId?: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Local debounced form state to avoid mobile keyboard losing focus due to parent re-renders
  const [local, setLocal] = useState<any>(value || {});
  const focusedRef = useRef(false);
  const flushTimerRef = useRef<number | null>(null);

  // Sync incoming prop changes into local when not focused
  useEffect(() => {
    if (focusedRef.current) return;
    setLocal(value || {});
  }, [value]);

  const scheduleFlush = () => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current as any);
    flushTimerRef.current = window.setTimeout(() => {
      try {
        onChange(local);
      } catch (e) {
        // ignore
      }
      flushTimerRef.current = null;
    }, 300);
  };

  const flushNow = () => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current as any);
      flushTimerRef.current = null;
    }
    onChange(local);
  };

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current as any);
    };
  }, []);

  const onFileChange = async (file: File) => {
    if (!file || !isSupabaseConfigured() || !userId) return;
    setUploading(true);
    // Ensure session is valid before attempting storage operations
    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) {
        // If refresh token issues, sign out and show toast
        try {
          const mod: any = await import("@/components/ui/use-toast");
          const toastFn = mod.toast || mod.default?.toast || mod.default || mod;
          if (typeof toastFn === "function") {
            toastFn({
              title: "Sessione non valida",
              description:
                "La sessione non è valida. Effettua il login nuovamente.",
              duration: 8000,
            });
          }
        } catch (t) {
          // ignore
        }
        await supabase.auth.signOut().catch(() => {});
        setUploading(false);
        return;
      }

      const uid = sessionData?.session?.user?.id ?? null;
      if (!uid || uid !== userId) {
        // session mismatch — avoid performing client-side writes that would violate RLS
        try {
          const mod: any = await import("@/components/ui/use-toast");
          const toastFn = mod.toast || mod.default?.toast || mod.default || mod;
          if (typeof toastFn === "function") {
            toastFn({
              title: "Utente non autenticato",
              description: "Effettua il login per poter caricare immagini.",
              duration: 8000,
            });
          }
        } catch (t) {}
        setUploading(false);
        return;
      }
    } catch (e) {
      // unexpected error obtaining session
      // eslint-disable-next-line no-console
      console.error("[AnagraficaForm] session check error:", e);
      setUploading(false);
      return;
    }

    // helper: upload via server endpoint using service_role key (fallback)
    const fallbackUploadToServer = async (f: File) => {
      // read file as base64
      const arr = await f.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(arr);
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk) as any);
      }
      const base64 = `data:${f.type};base64,${btoa(binary)}`;

      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token ?? null;

      // Try Vercel/SSR endpoint first (/api/upload), then Netlify function path if 404
    const tryEndpoints = ["/api/upload", "./.netlify/functions/api/upload", "./.netlify/functions/api/upload.js", "/.netlify/functions/api/upload"];
    let lastErr: any = null;
    for (const endpoint of tryEndpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ fileName: f.name, fileBase64: base64, userId }),
        });

        if (!res.ok) {
          // clone then read text to avoid "body stream already read" issues
          const cloned = res.clone();
          let bodyText: string | null = null;
          try {
            bodyText = await cloned.text();
          } catch (e) {
            bodyText = null;
          }
          // if 404 try next endpoint
          if (res.status === 404) {
            lastErr = new Error(`Server upload 404 at ${endpoint}`);
            continue;
          }
          throw new Error(`Server upload failed: ${res.status} ${bodyText ?? ""}`);
        }

        // prefer json, fall back to text
        let json: any = null;
        try {
          json = await res.json();
        } catch (e) {
          try {
            json = await res.text();
          } catch (t) {
            json = null;
          }
        }
        return json;
      } catch (e) {
        lastErr = e;
        // try next endpoint
      }
    }
    // if we reach here, all endpoints failed
    throw lastErr;
    };

    // Prefer server-side upload first to avoid client RLS issues
    try {
      const fallbackRes = await fallbackUploadToServer(file).catch(() => null);
      if (fallbackRes && fallbackRes.publicUrl) {
        onChange({ ...value, image_url: fallbackRes.publicUrl });
        setUploading(false);
        return;
      }
    } catch (e) {
      // ignore and fallback to client-side attempt
    }

    // Attempt upload from client (do not try to create bucket from client; anon key cannot create buckets)
    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;

    try {
      // quick check if bucket exists by listing root (will error if missing)
      const { error: listError } = await supabase.storage
        .from("characters")
        .list("");
      if (listError) {
        console.error("[AnagraficaForm] storage list error:", listError);
        try {
          const mod: any = await import("@/components/ui/use-toast");
          const toastFn = mod.toast || mod.default?.toast || mod.default || mod;
          if (typeof toastFn === "function") {
            toastFn({
              title: "Bucket mancante",
              description:
                "Il bucket 'characters' non esiste su Supabase. Crea il bucket 'characters' nella console Supabase > Storage.",
              duration: 10000,
            });
          }
        } catch (e) {
          console.warn(e);
        }
        setUploading(false);
        return;
      }

      const { error } = await supabase.storage
        .from("characters")
        .upload(path, file, { upsert: true });

      if (error) {
        const errAny = error as any;
        const msg =
          (errAny && (errAny.message || String(errAny))) || String(error);
        console.error("[AnagraficaForm] storage upload error:", error);
        const mod: any = await import("@/components/ui/use-toast");
        const toastFn = mod.toast || mod.default?.toast || mod.default || mod;

        // Detect RLS-related errors and show actionable instructions
        if (
          /row-level security/i.test(msg) ||
          /violates row-level security/i.test(msg) ||
          /new row violates row-level security policy/i.test(msg.toLowerCase())
        ) {
          // show instructions and attempt a server-side upload fallback
          if (typeof toastFn === "function") {
            toastFn({
              title: "Permessi database insufficienti",
              description:
                "L'operazione è stata bloccata da una policy RLS. Sto tentando un upload alternativo dal server. Se fallisce, esegui le query RLS nel SQL editor di Supabase (profiles/characters) come indicato nella documentazione.",
              duration: 20000,
            });
          }

          // attempt server-side fallback upload
          try {
            const fallbackRes = await fallbackUploadToServer(file);
            if (fallbackRes?.publicUrl) {
              onChange({ ...value, image_url: fallbackRes.publicUrl });
              setUploading(false);
              return;
            } else {
              if (typeof toastFn === "function") {
                toastFn({
                  title: "Fallback upload fallito",
                  description: "Il server non ha restituito un URL pubblico.",
                  duration: 10000,
                });
              }
            }
          } catch (e) {
            if (typeof toastFn === "function") {
              toastFn({
                title: "Fallback upload fallito",
                description: String(e),
                duration: 10000,
              });
            }
          }
        } else if (
          /bucket not found/i.test(msg) ||
          /not found/i.test(msg) ||
          (errAny && errAny.status === 404)
        ) {
          if (typeof toastFn === "function") {
            toastFn({
              title: "Bucket mancante",
              description:
                "Il bucket 'characters' non esiste su Supabase. Crea il bucket 'characters' nella console Supabase > Storage oppure contatta l'amministratore.",
              duration: 10000,
            });
          }
        } else {
          // general storage error
          if (typeof toastFn === "function") {
            toastFn({
              title: "Errore upload",
              description: msg,
              duration: 8000,
            });
          }
        }
      } else {
        const { data: pub } = supabase.storage
          .from("characters")
          .getPublicUrl(path);
        if (pub?.publicUrl) onChange({ ...value, image_url: pub.publicUrl });
      }
    } catch (e) {
      console.error("[AnagraficaForm] unexpected storage error:", e);
      try {
        const mod: any = await import("@/components/ui/use-toast");
        const toastFn = mod.toast || mod.default?.toast || mod.default || mod;
        if (typeof toastFn === "function") {
          toastFn({
            title: "Errore upload",
            description: String(e),
            duration: 8000,
          });
        }
      } catch (t) {
        // ignore
      }
    }
    setUploading(false);
  };

  // Helper to compute derived hp aggregates
  const computeHealthDerived = (h: any, lvl: number) => {
    const baseArr = [5, 4, 3, 2, 1, 0];
    const levelAdd = Math.max(0, (lvl || 1) - 1);
    let computedMax = 0;
    let computedTotalDamage = 0;
    const out: any = { ...(h || {}) };
    for (let i = 0; i < 6; i++) {
      const baseShown = baseArr[i] + (i < 5 ? levelAdd : 0);
      const bonus = Number(out[`hp_bonus_l${i + 1}`] ?? 0);
      const dmg = Number(out[`hp_dmg_l${i + 1}`] ?? 0);
      computedMax += baseShown + bonus;
      computedTotalDamage += dmg;
    }
    out.total_damage = computedTotalDamage;
    out.max = computedMax;
    out.current = Math.max(
      0,
      (out.current ?? computedMax) - computedTotalDamage,
    );
    return out;
  };

  // Distribute a total damage value across levels starting from level 1 to 6
  const distributeDamageAcrossLevels = (
    totalDamage: number,
    lvl: number,
    h: any,
  ) => {
    const baseArr = [5, 4, 3, 2, 1, 0];
    const levelAdd = Math.max(0, (lvl || 1) - 1);
    const allocated: Record<string, number> = {};
    let remaining = Math.max(0, Number(totalDamage) || 0);

    for (let i = 0; i < 6; i++) {
      const baseShown = baseArr[i] + (i < 5 ? levelAdd : 0);
      const bonus = Number((h && h[`hp_bonus_l${i + 1}`]) ?? 0);
      const capacity = baseShown + bonus;
      const take = Math.min(remaining, capacity);
      allocated[`hp_dmg_l${i + 1}`] = take;
      remaining -= take;
    }

    // If there's leftover damage beyond total capacity, apply it to hp_dmg_l6 (overflow)
    if (remaining > 0) {
      allocated[`hp_dmg_l6`] = (allocated[`hp_dmg_l6`] ?? 0) + remaining;
      remaining = 0;
    }

    return allocated;
  };

  const getWoundedLevel = (totalDamage: number, lvl: number, h: any) => {
    const baseArr = [5, 4, 3, 2, 1, 0];
    const levelAdd = Math.max(0, (lvl || 1) - 1);
    let remaining = Math.max(0, Number(totalDamage) || 0);
    for (let i = 0; i < 6; i++) {
      const cap =
        baseArr[i] +
        (i < 5 ? levelAdd : 0) +
        Number((h && h[`hp_bonus_l${i + 1}`]) ?? 0);
      if (remaining <= 0) return i === 0 ? 1 : i; // if no damage, level 1
      remaining -= cap;
      if (remaining <= 0) return i + 1;
    }
    return 6;
  };

  const updateHealth = (updates: Record<string, any>) => {
    const currentLevel = (value.status && value.status.level) || 1;
    // If updates contains total_damage, distribute into per-level hp_dmg_l*
    let merged = { ...(value.health || {}), ...updates };
    if (Object.prototype.hasOwnProperty.call(updates, "total_damage")) {
      const distributed = distributeDamageAcrossLevels(
        Number(updates.total_damage || 0),
        currentLevel,
        merged,
      );
      merged = { ...merged, ...distributed };
    }
    const computed = computeHealthDerived(merged, currentLevel);

    // Determine wounded level from computed total damage and per-level bonuses
    const woundedLevel = getWoundedLevel(
      computed.total_damage ?? 0,
      currentLevel,
      merged,
    );

    // Apply temporary malus when woundedLevel >= 4: -1 AGI, -1 RES
    const existingChars = value.characteristics || {};
    const agiTempKey = "AGI_temp";
    const resTempKey = "RES_temp";
    const shouldApply = woundedLevel >= 4;
    const newCharacteristics = {
      ...existingChars,
      [agiTempKey]: shouldApply ? -1 : 0,
      [resTempKey]: shouldApply ? -1 : 0,
    };

    onChange({
      ...value,
      health: computed,
      characteristics: newCharacteristics,
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input
          value={local.name}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => { focusedRef.current = false; flushNow(); }}
          onChange={(e) => { setLocal((p: any) => ({ ...p, name: e.target.value })); scheduleFlush(); }}
        />
      </div>
      <div className="space-y-2">
        <Label>Mestiere</Label>
        <Input
          value={local.job}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => { focusedRef.current = false; flushNow(); }}
          onChange={(e) => { setLocal((p: any) => ({ ...p, job: e.target.value })); scheduleFlush(); }}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Background</Label>
        <Textarea
          value={local.background}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => { focusedRef.current = false; flushNow(); }}
          onChange={(e) => { setLocal((p: any) => ({ ...p, background: e.target.value })); scheduleFlush(); }}
          rows={3}
        />
      </div>
      {/* Health table matching sheet layout */}
      <div className="md:col-span-2">
        <Label>Salute (PF)</Label>
        <div className="mt-2">
          <div className="hidden md:grid grid-cols-12 gap-2 items-center font-medium text-sm mb-2">
            <div className="col-span-4">Livello</div>
            <div className="col-span-3 text-center">Bonus xLiv</div>
            <div className="col-span-3 text-center">
              Danni ripartiti xLiv di Salute
            </div>
            <div className="col-span-2 text-center">Malus / Totali</div>
          </div>

          <div className="space-y-0">
            {[
              { key: "liv1", label: "Liv 1 - Illeso", base: 5 },
              { key: "liv2", label: "Liv 2 - Graffiato", base: 4 },
              { key: "liv3", label: "Liv 3 - Leso", base: 3 },
              { key: "liv4", label: "Liv 4 - Ferito", base: 2 },
              { key: "liv5", label: "Liv 5 - Straziato", base: 1 },
              { key: "liv6", label: "Liv 6 - Moribondo", base: 0 },
            ].map((lv, idx) => {
              const level = (value.status && value.status.level) || 1;
              const levelAdd = Math.max(0, level - 1);
              const baseShown = lv.base + (idx < 5 ? levelAdd : 0);
              const bonus =
                (value.health && (value.health[`hp_bonus_l${idx + 1}`] ?? 0)) ||
                0;
              const dmg =
                (value.health && (value.health[`hp_dmg_l${idx + 1}`] ?? 0)) ||
                0;
              const total = baseShown + bonus;

              return (
                <div
                  key={lv.key}
                  className="grid grid-cols-1 md:grid-cols-12 items-center gap-2 py-2 border-b"
                >
                  <div className="col-span-4 flex items-center justify-between">
                    <div className="text-sm">{lv.label}</div>
                    <div className="md:hidden text-xs text-muted-foreground">
                      Tot: {total}
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-3">
                    <Input
                      type="number"
                      value={
                        (local.health &&
                          (local.health[`hp_bonus_l${idx + 1}`] ?? 0)) ??
                        0
                      }
                      onFocus={() => { focusedRef.current = true; }}
                      onBlur={() => { focusedRef.current = false; flushNow(); }}
                      onChange={(e) => { setLocal((p: any) => ({ ...p, health: { ...(p.health || {}), [`hp_bonus_l${idx + 1}`]: Number(e.target.value) } })); scheduleFlush(); }}
                    />
                  </div>

                  <div className="col-span-1 md:col-span-3">
                    <Input
                      type="number"
                      value={
                        (local.health &&
                          (local.health[`hp_dmg_l${idx + 1}`] ?? 0)) ??
                        0
                      }
                      onFocus={() => { focusedRef.current = true; }}
                      onBlur={() => { focusedRef.current = false; flushNow(); }}
                      onChange={(e) => { setLocal((p: any) => ({ ...p, health: { ...(p.health || {}), [`hp_dmg_l${idx + 1}`]: Number(e.target.value) } })); scheduleFlush(); }}
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    {/* empty cell to keep alignment on desktop */}
                    <div className="hidden md:block w-full h-10" />
                  </div>
                </div>
              );
            })}

            {/* Totals and malus (aligned to right column on desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-12 items-start gap-2 py-2">
              <div className="col-span-4 md:col-span-4"></div>
              <div className="col-span-1 md:col-span-3"></div>
              <div className="col-span-1 md:col-span-3"></div>
              <div className="col-span-1 md:col-span-2">
                <div className="mb-2 text-sm font-medium">Malus subiti</div>
                <div className="space-y-2">
                  <div className="border-b py-2">
                    <Input
                      value={(local.health && local.health.malus_notes) ?? ""}
                      onFocus={() => { focusedRef.current = true; }}
                      onBlur={() => { focusedRef.current = false; flushNow(); }}
                      onChange={(e) => { setLocal((p: any) => ({ ...p, health: { ...(p.health || {}), malus_notes: e.target.value } })); scheduleFlush(); }}
                    />
                  </div>
                  <div className="border-b py-2">
                    <Label className="text-xs">Danni subiti totali</Label>
                    <Input
                      type="number"
                      value={(local.health && local.health.total_damage) ?? 0}
                      onFocus={() => { focusedRef.current = true; }}
                      onBlur={() => { focusedRef.current = false; flushNow(); }}
                      onChange={(e) => { setLocal((p: any) => ({ ...p, health: { ...(p.health || {}), total_damage: Number(e.target.value) } })); scheduleFlush(); }}
                    />
                  </div>
                  <div className="border-b py-2">
                    <Label className="text-xs">Totale PF</Label>
                    <Input
                      type="number"
                      value={(value.health && value.health.max) ?? 0}
                      readOnly
                    />
                  </div>
                  <div className="pt-2">
                    <div className="text-sm font-medium">Effetti</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      -3 mt al Mov. / -1 in AGI / -1 in RES (applicare
                      manualmente o tramite regole di gioco)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="my-3" />

          <h5 className="font-heading">Punti e Risorse</h5>
          <div className="grid grid-cols-4 gap-2 mt-2">
            <div className="p-2 bg-secondary rounded">
              Stanchezza: {value.points.fatigue}
            </div>
            <div className="p-2 bg-secondary rounded">
              Shounen: {value.points.shounen}
            </div>
            <div className="p-2 bg-secondary rounded">
              Volontà: {value.points.willpower}
            </div>
            <div className="p-2 bg-secondary rounded">
              Morale: {value.points.morale}
            </div>
          </div>
        </div>
      </div>

      {/* Modifiers */}
      <div className="md:col-span-2 space-y-2">
        <Label>Modificatori (movement / AGI / RES)</Label>
        <div className="grid grid-cols-3 gap-2">
          <Input
            type="number"
            placeholder="movement"
            value={local.modifiers?.movement ?? 0}
            onFocus={() => { focusedRef.current = true; }}
            onBlur={() => { focusedRef.current = false; flushNow(); }}
            onChange={(e) => { setLocal((p: any) => ({ ...p, modifiers: { ...(p.modifiers || {}), movement: Number(e.target.value) } })); scheduleFlush(); }}
          />
          <Input
            type="number"
            placeholder="AGI"
            value={local.modifiers?.AGI ?? 0}
            onFocus={() => { focusedRef.current = true; }}
            onBlur={() => { focusedRef.current = false; flushNow(); }}
            onChange={(e) => { setLocal((p: any) => ({ ...p, modifiers: { ...(p.modifiers || {}), AGI: Number(e.target.value) } })); scheduleFlush(); }}
          />
          <Input
            type="number"
            placeholder="RES"
            value={local.modifiers?.RES ?? 0}
            onFocus={() => { focusedRef.current = true; }}
            onBlur={() => { focusedRef.current = false; flushNow(); }}
            onChange={(e) => { setLocal((p: any) => ({ ...p, modifiers: { ...(p.modifiers || {}), RES: Number(e.target.value) } })); scheduleFlush(); }}
          />
        </div>
      </div>

      {/* Amicizia & Affinità section */}
      <div className="md:col-span-2 space-y-2">
        <Label>Amicizia & Affinità</Label>
        <div className="space-y-2">
          {(value.affinities || []).map((a: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                placeholder="Nome PG"
                value={local.affinities?.[idx]?.name || ""}
                onFocus={() => { focusedRef.current = true; }}
                onBlur={() => { focusedRef.current = false; flushNow(); }}
                onChange={(e) => {
                  const next = [...(local.affinities || [])];
                  next[idx] = { ...(next[idx] || {}), name: e.target.value };
                  setLocal((p: any) => ({ ...p, affinities: next }));
                  scheduleFlush();
                }}
              />

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={() => {
                    const next = [...(local.affinities || [])];
                    next[idx] = { ...(next[idx] || {}), value: (Number(next[idx]?.value) || 0) - 1 };
                    setLocal((p: any) => ({ ...p, affinities: next }));
                    scheduleFlush();
                  }}
                >
                  -
                </Button>
                <Input
                  type="number"
                  className="w-20 text-center"
                  value={Number(local.affinities?.[idx]?.value || 0)}
                  onFocus={() => { focusedRef.current = true; }}
                  onBlur={() => { focusedRef.current = false; flushNow(); }}
                  onChange={(e) => {
                    const v = Number(e.target.value || 0);
                    const next = [...(local.affinities || [])];
                    next[idx] = { ...(next[idx] || {}), value: v };
                    setLocal((p: any) => ({ ...p, affinities: next }));
                    scheduleFlush();
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const next = [...(local.affinities || [])];
                    next[idx] = { ...(next[idx] || {}), value: (Number(next[idx]?.value) || 0) + 1 };
                    setLocal((p: any) => ({ ...p, affinities: next }));
                    scheduleFlush();
                  }}
                >
                  +
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const next = [...(local.affinities || [])];
                  next.splice(idx, 1);
                  setLocal((p: any) => ({ ...p, affinities: next }));
                  scheduleFlush();
                }}
              >
                Rimuovi
              </Button>
            </div>
          ))}

          <Button
            onClick={() => {
              const next = [...(local.affinities || []), { name: "", value: 0 }];
              setLocal((p: any) => ({ ...p, affinities: next }));
              scheduleFlush();
            }}
          >
            Aggiungi amicizia
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Sogno</Label>
        <Input
          value={value.dream}
          onChange={(e) => onChange({ ...value, dream: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Razza</Label>
        <Input
          value={value.race}
          onChange={(e) => onChange({ ...value, race: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Taglia</Label>
        <Input
          value={value.size}
          onChange={(e) => onChange({ ...value, size: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Ciurma</Label>
        <Input
          value={value.crew}
          onChange={(e) => onChange({ ...value, crew: e.target.value })}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Aspetto</Label>
        <Textarea
          value={value.appearance}
          onChange={(e) => onChange({ ...value, appearance: e.target.value })}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Immagine</Label>
        <div className="flex items-center gap-3">
          <Input
            type="file"
            accept="image/*"
            ref={fileRef}
            onChange={(e) => e.target.files && onFileChange(e.target.files[0])}
          />
          {value.image_url && (
            <img
              src={value.image_url}
              alt="avatar"
              className="h-12 w-12 rounded object-cover border"
            />
          )}
          <Button
            type="button"
            variant="secondary"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Carico..." : "Upload"}
          </Button>
        </div>
      </div>
    </div>
  );
}
