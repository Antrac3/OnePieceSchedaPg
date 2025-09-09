import AnagraficaForm from "@/features/character/AnagraficaForm";
import CaratteristicheForm from "@/features/character/CaratteristicheForm";
import PointsAbilitiesForm from "@/features/character/PointsAbilitiesForm";
import { CharacterSheet } from "@shared/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PirateButton from "@/components/ui/pirate-button";
import PirateCard from "@/components/ui/pirate-card";
import { useSessionProfile } from "@/hooks/useSessionProfile";
import { fetchCharacterByUser, upsertCharacter, fetchAllCharacters } from "@/features/character/api";
import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";

const empty: CharacterSheet = {
  name: "",
  background: "",
  dream: "",
  race: "",
  size: "",
  crew: "",
  appearance: "",
  job: "",
  characteristics: {
    POT: 5,
    AGI: 5,
    RES: 5,
    CAR: 5,
    VOL: 5,
    PER: 5,
    combatStyle: "",
  },
  points: { fatigue: 0, shounen: 0, willpower: 0, morale: 0 },
  abilities: {
    physical: [],
    interaction: [],
    combat: [],
    social: [],
    naval: [],
    profession: [],
    knowledge: [],
  },
  status: {
    traits: [],
    qualities: [],
    alterations: [],
    level: 1,
    experience: 0,
  },
  combat: {
    defense: 0,
    rd: 0,
    initiative: 0,
    baseMovement: 5,
    attacks: [],
    takenDamage: "",
    tempModifiers: "",
    techniques: [],
  },
  equipment: {
    items: [],
    meleeWeapons: [],
    rangedWeapons: [],
    relations: [],
    notes: [],
  },
  health: { max: 10, current: 10, wounds: 0, malus_notes: "" },
  modifiers: { movement: 0, AGI: 0, RES: 0 },
};

export default function Dashboard() {
  const { userId, isAuthenticated, sessionLoading, role } = useSessionProfile();
  const [sheet, setSheet] = useState<CharacterSheet>(empty);
  const [loading, setLoading] = useState(false);
  const [all, setAll] = useState<any[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionLoading) return;
    if (!isAuthenticated) { navigate("/auth"); return; }
    async function load() { if (!userId) return; try { const data = await fetchCharacterByUser(userId); if (data) setSheet(data); } catch (e) { console.error(e); } }
    load();
  }, [userId, isAuthenticated, sessionLoading, navigate]);

  useEffect(() => {
    let mounted = true;
    async function loadIfMaster() {
      if (role !== "master") return;
      try { const rows = await fetchAllCharacters(); if (mounted) setAll(rows); } catch (err) { console.error(err); }
    }
    loadIfMaster();
    return () => { mounted = false; };
  }, [role]);

  const save = async () => {
    if (!isAuthenticated) return navigate("/auth");
    setLoading(true);
    try { const res = await upsertCharacter({ ...sheet, user_id: userId }); setSheet(res); } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <>
      {role === "master" ? (
        <div>
          <h2 className="text-3xl font-display text-yellow-500 mb-4">Bacheca del Capitano</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {all === null ? <div>Caricamento...</div> : all.length === 0 ? <div>Nessuna scheda</div> : all.map((s: any) => (
              <PirateCard key={s.id} className="p-4">
                <img src={s.image_url} alt="avatar" className="w-full h-44 object-cover rounded mb-3" />
                <div className="font-display text-xl">{s.name || "(no name)"}</div>
                <div className="text-sm text-muted-foreground">Giocatore: {s.profiles?.email ?? s.user_id}</div>
                <div className="mt-3 flex gap-2">
                  <PirateButton onClick={() => navigate(`/view?userId=${encodeURIComponent(s.user_id)}`)} className="bg-yellow-500 text-white">Vedi</PirateButton>
                </div>
              </PirateCard>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-3xl font-display text-yellow-500 mb-4">Compila la tua Scheda</h2>
          <Tabs defaultValue="anagrafica">
            <TabsList>
              <TabsTrigger value="anagrafica">Dati Anagrafici</TabsTrigger>
              <TabsTrigger value="caratteristiche">Caratteristiche</TabsTrigger>
              <TabsTrigger value="punti">Punti & Abilità</TabsTrigger>
            </TabsList>
            <TabsContent value="anagrafica" className="mt-4">
              <AnagraficaForm value={sheet} onChange={(v) => setSheet((prev) => ({ ...prev, ...v }))} userId={userId} />
            </TabsContent>
            <TabsContent value="caratteristiche" className="mt-4">
              <CaratteristicheForm value={sheet.characteristics} onChange={(v) => setSheet((prev) => ({ ...prev, characteristics: { ...prev.characteristics, ...v } }))} />
            </TabsContent>
            <TabsContent value="punti" className="mt-4">
              <PointsAbilitiesForm value={{ ...sheet.points, abilities: sheet.abilities, abilitiesText: Object.values(sheet.abilities || {}).flat().join("\n") }} onChange={(v) => setSheet((prev) => ({ ...prev, points: { ...prev.points, ...(v.points || {}) }, abilities: { ...prev.abilities, ...(v.abilities || {}) } }))} />
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex gap-3">
            <PirateButton onClick={save} className="bg-yellow-500 text-white" disabled={loading}>{loading ? "Salvando..." : "Salva scheda"}</PirateButton>
            <PirateButton variant="outline" onClick={() => navigate("/view")}>Visualizza scheda</PirateButton>
          </div>
        </div>
      )}
    </>
  );
}
