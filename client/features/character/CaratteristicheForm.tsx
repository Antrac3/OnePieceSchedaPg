import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  // Render each characteristic across three columns: base, bonus/malus and temp
  const Row = ({ label, keyBase }: { label: string; keyBase: keyof typeof value }) => (
    <div className="grid grid-cols-3 gap-2 items-center">
      <div>
        <Label className="text-sm">{label}</Label>
        <Input
          type="number"
          value={(value[keyBase] as number) ?? 0}
          onChange={(e) => onChange({ ...value, [keyBase]: Number(e.target.value) })}
        />
      </div>
      <div>
        <Label className="text-sm">Bonus/Malus</Label>
        <Input
          type="number"
          value={(value[`${String(keyBase)}_bonus` as any] as number) ?? 0}
          onChange={(e) => onChange({ ...value, [`${String(keyBase)}_bonus`]: Number(e.target.value) })}
        />
      </div>
      <div>
        <Label className="text-sm">Temp.</Label>
        <Input
          type="number"
          value={(value[`${String(keyBase)}_temp` as any] as number) ?? 0}
          onChange={(e) => onChange({ ...value, [`${String(keyBase)}_temp`]: Number(e.target.value) })}
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
          value={value.combatStyle}
          onChange={(e) => onChange({ ...value, combatStyle: e.target.value })}
        />
      </div>
    </div>
  );
}
