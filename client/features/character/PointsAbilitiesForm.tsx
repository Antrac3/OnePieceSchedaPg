import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo, useState, useRef } from "react";

const CATEGORIES = [
  { key: "physical", label: "Fisiche" },
  { key: "interaction", label: "Interazione" },
  { key: "combat", label: "Combattimento" },
  { key: "social", label: "Sociali" },
  { key: "naval", label: "Navali" },
  { key: "profession", label: "Professioni" },
  { key: "knowledge", label: "Conoscenze" },
];

export default function PointsAbilitiesForm({
  value,
  onChange,
}: {
  value: any; // includes points fields and abilities map and abilitiesText
  onChange: (v: any) => void;
}) {
  // value may contain fatigue, shounen, willpower, morale, abilities (map), abilitiesText
  const [text, setText] = useState<string>(value.abilitiesText ?? "");
  const [entries, setEntries] = useState<{ text: string; category: string }[]>([]);

  const initRef = useRef(false);
  const lastSentRef = useRef<string | null>(null);

  // Local debounced points state to avoid kitchen keyboard closing on mobile due to frequent re-renders
  const [localPoints, setLocalPoints] = useState({
    fatigue: Number(value.fatigue ?? 0),
    shounen: Number(value.shounen ?? 0),
    willpower: Number(value.willpower ?? 0),
    morale: Number(value.morale ?? 0),
    material: Number(value.material ?? 0),
  });
  const focusedRef = useRef(false);
  const flushTimerRef = useRef<number | null>(null);

  // Sync prop changes into localPoints only when inputs are not focused
  useEffect(() => {
    if (focusedRef.current) return;
    setLocalPoints({
      fatigue: Number(value.fatigue ?? 0),
      shounen: Number(value.shounen ?? 0),
      willpower: Number(value.willpower ?? 0),
      morale: Number(value.morale ?? 0),
      material: Number(value.material ?? 0),
    });
  }, [value.fatigue, value.shounen, value.willpower, value.morale, value.material]);

  const scheduleFlush = () => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current as any);
    }
    flushTimerRef.current = window.setTimeout(() => {
      try {
        onChange({ points: { ...localPoints } });
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
    onChange({ points: { ...localPoints } });
  };

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current as any);
    };
  }, []);

  // Initialize entries from props once on mount
  useEffect(() => {
    const buildFromAbilities = () => {
      const list: { text: string; category: string }[] = [];
      for (const cat of CATEGORIES) {
        (value.abilities?.[cat.key] || []).forEach((t: string) => {
          if (t && t.trim()) list.push({ text: t.trim(), category: cat.key });
        });
      }
      return list;
    };

    let initialEntries: { text: string; category: string }[] = [];
    let initialText = "";

    if (value.abilities && Object.keys(value.abilities).length > 0) {
      initialEntries = buildFromAbilities();
      initialText = initialEntries.map((e) => e.text).join("\n");
    } else if (value.abilitiesText) {
      initialText = value.abilitiesText;
      const lines = (value.abilitiesText || "").split("\n").map((l: string) => l.trim()).filter(Boolean);
      initialEntries = lines.map((l: string) => ({ text: l, category: "social" }));
    }

    setEntries(initialEntries);
    setText(initialText);

    initRef.current = true;

    // set lastSentRef to initial payload to avoid immediate echo
    const initMap: Record<string, string[]> = {};
    for (const cat of CATEGORIES) initMap[cat.key] = [];
    for (const e of initialEntries) {
      if (!e.text) continue;
      if (!initMap[e.category]) initMap[e.category] = [];
      initMap[e.category].push(e.text);
    }
    const initPayload = { points: { fatigue: value.fatigue, shounen: value.shounen, willpower: value.willpower, morale: value.morale, material: value.material }, abilities: initMap, abilitiesText: initialEntries.map((x) => x.text).join("\n") };
    lastSentRef.current = JSON.stringify(initPayload);
  }, []);

  // Whenever entries change, propagate abilities mapping up
  useEffect(() => {
    // avoid firing on initial sync
    if (!initRef.current) return;

    const map: Record<string, string[]> = {};
    for (const cat of CATEGORIES) map[cat.key] = [];
    for (const e of entries) {
      if (!e.text || !e.text.trim()) continue;
      if (!map[e.category]) map[e.category] = [];
      map[e.category].push(e.text.trim());
    }

    const newPayload = { points: { fatigue: value.fatigue, shounen: value.shounen, willpower: value.willpower, morale: value.morale, material: value.material }, abilities: map, abilitiesText: entries.map((x) => x.text).join("\n") };

    const newSnapshot = JSON.stringify(newPayload);

    if (lastSentRef.current !== newSnapshot) {
      lastSentRef.current = newSnapshot;
      onChange(newPayload);
    }
  }, [entries, value.fatigue, value.shounen, value.willpower, value.morale, value.material]);

  const addEntry = () => setEntries((prev) => [...prev, { text: "", category: "social" }]);
  const updateEntryText = (idx: number, t: string) => setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, text: t } : e)));
  const updateEntryCategory = (idx: number, c: string) => setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, category: c } : e)));
  const removeEntry = (idx: number) => setEntries((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Stanchezza</Label>
        <Input
          type="number"
          value={localPoints.fatigue}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => { focusedRef.current = false; flushNow(); }}
          onChange={(e) => { setLocalPoints((p) => ({ ...p, fatigue: Number(e.target.value) })); scheduleFlush(); }}
        />
      </div>
      <div className="space-y-2">
        <Label>Shounen</Label>
        <Input
          type="number"
          value={localPoints.shounen}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => { focusedRef.current = false; flushNow(); }}
          onChange={(e) => { setLocalPoints((p) => ({ ...p, shounen: Number(e.target.value) })); scheduleFlush(); }}
        />
      </div>
      <div className="space-y-2">
        <Label>Volontà</Label>
        <Input
          type="number"
          value={localPoints.willpower}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => { focusedRef.current = false; flushNow(); }}
          onChange={(e) => { setLocalPoints((p) => ({ ...p, willpower: Number(e.target.value) })); scheduleFlush(); }}
        />
      </div>
      <div className="space-y-2">
        <Label>Morale</Label>
        <Input
          type="number"
          value={localPoints.morale}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => { focusedRef.current = false; flushNow(); }}
          onChange={(e) => { setLocalPoints((p) => ({ ...p, morale: Number(e.target.value) })); scheduleFlush(); }}
        />
      </div>

      <div className="space-y-2">
        <Label>Punti Materiale</Label>
        <Input
          type="number"
          value={localPoints.material}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => { focusedRef.current = false; flushNow(); }}
          onChange={(e) => { setLocalPoints((p) => ({ ...p, material: Number(e.target.value) })); scheduleFlush(); }}
        />
      </div>

      <div className="md:col-span-2 space-y-2">
        <Label>Abilità (una per riga - separa con invio)</Label>
        <Textarea
          value={text}
          onChange={(e) => {
            const newText = e.target.value;
            setText(newText);
            const lines = newText.split("\n").map((l) => l.trim()).filter(Boolean);
            // keep existing categories where possible, otherwise default to social
            setEntries((prev) => {
              const out: { text: string; category: string }[] = [];
              for (let i = 0; i < lines.length; i++) {
                const prevEntry = prev[i];
                out.push({ text: lines[i], category: prevEntry ? prevEntry.category : "social" });
              }
              return out;
            });
          }}
          rows={6}
        />

        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Righe abilità</div>
            <button type="button" className="text-sm text-primary" onClick={addEntry}>
              + Aggiungi riga
            </button>
          </div>

          <div className="space-y-2">
            {entries.map((e, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  className="flex-1 rounded border px-2 py-1"
                  value={e.text}
                  onChange={(ev) => updateEntryText(idx, ev.target.value)}
                />
                <select className="rounded border px-2 py-1" value={e.category} onChange={(ev) => updateEntryCategory(idx, ev.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button type="button" className="text-sm text-destructive" onClick={() => removeEntry(idx)}>
                  Rimuovi
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
