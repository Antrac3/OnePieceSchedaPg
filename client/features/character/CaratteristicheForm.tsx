import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState } from "react";

export default function CaratteristicheForm({
  value,
  onChange,
}: {
  value: {
    POT: number;
    AGI: number;
    RES: number;
    CAR: number;
    VOL: number;
    PER: number;
    combatStyle: string;
  };
  onChange: (v: any) => void;
}) {
  // Local debounced state to avoid frequent parent updates that break mobile input focus
  const [local, setLocal] = useState<any>(value || {});
  const focusedRef = useRef(false);
  const flushTimerRef = useRef<number | null>(null);

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

  // Render each characteristic across three columns: base, bonus/malus and temp
  const Row = ({ label, keyBase }: { label: string; keyBase: keyof typeof value }) => (
    <div className="grid grid-cols-3 gap-2 items-center">
      <div>
        <Label className="text-sm">{label}</Label>
        <Input
          type="number"
          value={(local[keyBase] as number) ?? 0}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => { focusedRef.current = false; flushNow(); }}
          onChange={(e) => { setLocal((p: any) => ({ ...p, [keyBase]: Number(e.target.value) })); scheduleFlush(); }}
        />
      </div>
      <div>
        <Label className="text-sm">Bonus/Malus</Label>
        <Input
          type="number"
          value={(local[`${String(keyBase)}_bonus` as any] as number) ?? 0}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => { focusedRef.current = false; flushNow(); }}
          onChange={(e) => { setLocal((p: any) => ({ ...p, [`${String(keyBase)}_bonus`]: Number(e.target.value) })); scheduleFlush(); }}
        />
      </div>
      <div>
        <Label className="text-sm">Temp.</Label>
        <Input
          type="number"
          value={(local[`${String(keyBase)}_temp` as any] as number) ?? 0}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => { focusedRef.current = false; flushNow(); }}
          onChange={(e) => { setLocal((p: any) => ({ ...p, [`${String(keyBase)}_temp`]: Number(e.target.value) })); scheduleFlush(); }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-4 items-start">
          <div className="col-span-1 font-semibold">Punti base</div>
          <div className="col-span-1 font-semibold">Bonus/malus</div>
          <div className="col-span-1 font-semibold">Temp.</div>
        </div>
        <Row label="Potenza (POT)" keyBase="POT" />
        <Row label="Agilità (AGI)" keyBase="AGI" />
        <Row label="Resistenza (RES)" keyBase="RES" />
        <Row label="Carisma (CAR)" keyBase="CAR" />
        <Row label="Volontà (VOL)" keyBase="VOL" />
        <Row label="Percezione (PER)" keyBase="PER" />
      </div>

      <div className="space-y-1">
        <Label>Stile di Combattimento</Label>
        <Input
          value={local.combatStyle}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => { focusedRef.current = false; flushNow(); }}
          onChange={(e) => { setLocal((p: any) => ({ ...p, combatStyle: e.target.value })); scheduleFlush(); }}
        />
      </div>
    </div>
  );
}
