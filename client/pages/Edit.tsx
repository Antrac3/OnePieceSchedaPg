import { useEffect, useState } from "react";
import { useSessionProfile } from "@/hooks/useSessionProfile";
import {
  fetchCharacterByUser,
  upsertCharacter,
} from "@/features/character/api";
import AnagraficaForm from "@/features/character/AnagraficaForm";
import CaratteristicheForm from "@/features/character/CaratteristicheForm";
import PointsAbilitiesForm from "@/features/character/PointsAbilitiesForm";
import { Button } from "@/components/ui/button";
import { CharacterSheet } from "@shared/api";
import { useNavigate } from "react-router-dom";

export default function EditPage() {
  const { userId, isAuthenticated, sessionLoading } = useSessionProfile();
  const [sheet, setSheet] = useState<CharacterSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionLoading) return; // wait for auth resolution
    if (!isAuthenticated) return navigate('/auth', { state: { from: { pathname: window.location.pathname } } });
    async function load() {
      if (!userId) return;
      const data = await fetchCharacterByUser(userId);
      setSheet(data);
    }
    load();
  }, [userId, isAuthenticated, sessionLoading]);

  const save = async () => {
    if (!isAuthenticated) return navigate("/auth");
    if (!sheet) return;
    setLoading(true);
    try {
      const res = await upsertCharacter({ ...sheet, user_id: userId });
      setSheet(res);
      navigate("/view");
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (!sheet) return <div>Caricamento...</div>;

  return (
    <div>
      <h2 className="text-2xl font-heading mb-4">Modifica Scheda</h2>
      <div className="space-y-4">
        <AnagraficaForm
          value={sheet}
          onChange={(v) => setSheet((prev) => (prev ? { ...prev, ...v } : v))}
          userId={userId}
        />
        <CaratteristicheForm
          value={sheet.characteristics}
          onChange={(v) =>
            setSheet((prev) =>
              prev
                ? {
                    ...prev,
                    characteristics: { ...prev.characteristics, ...v },
                  }
                : prev,
            )
          }
        />
        <PointsAbilitiesForm
          value={sheet.points}
          onChange={(v) =>
            setSheet((prev) =>
              prev ? { ...prev, points: { ...prev.points, ...v } } : prev,
            )
          }
        />
      </div>
      <div className="mt-4 flex gap-2">
        <Button onClick={save} disabled={loading}>
          {loading ? "Aggiornando..." : "Aggiorna"}
        </Button>
        <Button variant="outline" onClick={() => navigate("/view")}>
          Annulla
        </Button>
      </div>
    </div>
  );
}
