import React from "react";
import PirateButton from "@/components/ui/pirate-button";
import { useSessionProfile } from "@/hooks/useSessionProfile";
import { fetchCharacterByUser } from "@/features/character/api";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function ViewPage() {
  const { userId: sessionUserId, isAuthenticated, sessionLoading, role } = useSessionProfile();
  const [sheet, setSheet] = React.useState<any>(null);
  const [resolvedImage, setResolvedImage] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const overrideUserId = params.get("userId");

  React.useEffect(() => {
    if (sessionLoading) return;
    if (!isAuthenticated) return navigate('/auth');
    async function load() {
      const targetUser = role === 'master' && overrideUserId ? overrideUserId : sessionUserId;
      if (!targetUser) return;
      const data = await fetchCharacterByUser(targetUser);
      setSheet(data);
    }
    load();
  }, [sessionUserId, isAuthenticated, sessionLoading, overrideUserId, role, navigate]);

  React.useEffect(() => {
    let mounted = true;
    async function resolve() {
      if (!sheet?.image_url) return;
      if (mounted) setResolvedImage(null);
      try { const resp = await fetch(sheet.image_url, { method: 'HEAD' }); if (resp.ok) { if (mounted) setResolvedImage(sheet.image_url); return; } } catch (e) {}
      try {
        const url = new URL(sheet.image_url);
        const parts = url.pathname.split('/');
        const idx = parts.indexOf('characters');
        const path = idx >= 0 ? parts.slice(idx + 1).join('/') : undefined;
        if (path) {
          const res = await fetch('/api/signed-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, bucket: 'characters', expires: 60 }) });
          if (res.ok) { const json = await res.json(); if (json?.signedUrl && mounted) setResolvedImage(json.signedUrl); return; }
        }
      } catch (e) { }
    }
    resolve();
    return () => { mounted = false; };
  }, [sheet?.image_url]);

  const exportPdf = async () => {
    if (!containerRef.current) return;
    const canvas = await html2canvas(containerRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${sheet?.name || "scheda"}.pdf`);
  };

  if (!sheet) return <div>Caricamento scheda...</div>;

  const affinities = sheet.affinities ?? sheet.points?.affinities ?? [];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-display">Scheda di {sheet.name}</h2>
        <div className="flex gap-2">
          <PirateButton onClick={() => navigate("/edit")}>Modifica</PirateButton>
          <PirateButton onClick={exportPdf}>Esporta PDF</PirateButton>
        </div>
      </div>

      <div ref={containerRef} className="p-6 bg-[linear-gradient(180deg,#fff6e1, #f0e3c8)] rounded shadow-lg wanted-poster">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Dati Anagrafici */}
          <div className="col-span-1">
            <div className="p-4 bg-white rounded shadow text-center">
              <img src={resolvedImage ?? undefined} alt="avatar" className="w-full h-56 object-cover rounded border-4 border-yellow-200" />
              <h3 className="mt-3 font-display text-2xl">{sheet.name}</h3>
              <p className="text-sm">{sheet.job} · {sheet.crew}</p>
              <div className="mt-3 text-sm text-left">
                <div><strong>Background:</strong> {sheet.background}</div>
                <div><strong>Razza:</strong> {sheet.race}</div>
                <div><strong>Taglia:</strong> {sheet.size}</div>
                <div><strong>Aspetto:</strong> {sheet.appearance}</div>
              </div>
            </div>
          </div>

          {/* Caratteristiche */}
          <div className="md:col-span-2">
            <div className="p-4 bg-white rounded shadow mb-4">
              <h4 className="font-display">Caratteristiche</h4>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {['POT','AGI','RES','CAR','VOL','PER'].map((k) => (
                  <div key={k} className="p-2 bg-yellow-50 rounded text-center">{k}<br/>{sheet.characteristics?.[k]}</div>
                ))}
              </div>
            </div>

            {/* Punti & Abilità */}
            <div className="p-4 bg-white rounded shadow mb-4">
              <h4 className="font-display">Livelli di Salute</h4>
              <div className="mt-2">
                <div className="hidden md:grid grid-cols-12 gap-2 items-center font-medium text-sm mb-2">
                  <div className="col-span-4">Livello</div>
                  <div className="col-span-3 text-center">Bonus xLiv</div>
                  <div className="col-span-3 text-center">Danni ripartiti</div>
                  <div className="col-span-2 text-center">Totali</div>
                </div>

                {[
                  { key: 'liv1', label: 'Liv 1 - Illeso', base: 5 },
                  { key: 'liv2', label: 'Liv 2 - Graffiato', base: 4 },
                  { key: 'liv3', label: 'Liv 3 - Leso', base: 3 },
                  { key: 'liv4', label: 'Liv 4 - Ferito', base: 2 },
                  { key: 'liv5', label: 'Liv 5 - Straziato', base: 1 },
                  { key: 'liv6', label: 'Liv 6 - Moribondo', base: 0 },
                ].map((lv, idx) => {
                  const level = (sheet.status && sheet.status.level) || 1;
                  const levelAdd = Math.max(0, level - 1);
                  const baseShown = lv.base + (idx < 5 ? levelAdd : 0);
                  const bonus = sheet.health?.[`hp_bonus_l${idx + 1}`] ?? 0;
                  const dmg = sheet.health?.[`hp_dmg_l${idx + 1}`] ?? 0;
                  const total = baseShown + Number(bonus);

                  return (
                    <div key={lv.key} className="grid grid-cols-1 md:grid-cols-12 items-center gap-2 py-2 border-b">
                      <div className="col-span-4 flex items-center justify-between">
                        <div className="text-sm">{lv.label}</div>
                        <div className="md:hidden text-xs text-muted-foreground">Tot: {total}</div>
                      </div>

                      <div className="col-span-1 md:col-span-3 flex items-center justify-center">
                        <div className="p-2 bg-muted rounded text-center w-full">{bonus}</div>
                      </div>

                      <div className="col-span-1 md:col-span-3 flex items-center justify-center">
                        <div className="p-2 bg-muted rounded text-center w-full">{dmg}</div>
                      </div>

                      <div className="col-span-1 md:col-span-2 flex items-center justify-center">
                        {idx === 0 ? (
                          <div className="space-y-2">
                            <div className="p-2 bg-secondary rounded">Totale PF: {sheet.health?.max ?? sheet.hp_max ?? 0}</div>
                            <div className="p-2 bg-secondary rounded">Danni subiti: {sheet.health?.total_damage ?? sheet.hp_total_damage ?? 0}</div>
                            <div className="p-2 bg-secondary rounded">PF Correnti: {sheet.health?.current ?? sheet.hp_current ?? 0}</div>
                          </div>
                        ) : (
                          <div className="hidden md:block w-full h-24" />
                        )}
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>

            <div className="p-4 bg-white rounded shadow">
              <h4 className="font-display">Punti & Abilità</h4>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="p-2 bg-secondary rounded">Stanchezza: {sheet.points?.fatigue}</div>
                <div className="p-2 bg-secondary rounded">Shounen: {sheet.points?.shounen}</div>
                <div className="p-2 bg-secondary rounded">Volontà: {sheet.points?.willpower}</div>
                <div className="p-2 bg-secondary rounded">Morale: {sheet.points?.morale}</div>
                <div className="p-2 bg-secondary rounded">Punti Materiale: {sheet.points?.material}</div>
              </div>

              <div className="mt-4">
                <h5 className="font-display">Abilità</h5>
                <div className="grid md:grid-cols-3 gap-4 mt-2">
                  {Object.entries(sheet.abilities || {}).map(([cat, vals]: any) => (
                    <div key={cat}>
                      <div className="font-medium">{cat}</div>
                      <ul className="list-disc list-inside">
                        {(vals || []).map((v: string, i: number) => <li key={i}>{v}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <h5 className="font-display">Amicizia & Affinità</h5>
                <div className="mt-2 space-y-2">
                  {affinities.length === 0 ? <div className="text-sm text-muted-foreground">Nessuna affinità registrata.</div> : affinities.map((a: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                      <div>{a.name}</div>
                      <div className="font-bold">{a.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
