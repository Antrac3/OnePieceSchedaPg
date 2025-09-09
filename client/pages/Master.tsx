import React from "react";
import PirateCard from "@/components/ui/pirate-card";
import PirateButton from "@/components/ui/pirate-button";
import { useNavigate } from "react-router-dom";
import { useSessionProfile } from "@/hooks/useSessionProfile";
import { getSupabase } from "@/lib/supabase"; const supabase = getSupabase();

export default function MasterPage() {
  const { role, isAuthenticated } = useSessionProfile();
  const [list, setList] = React.useState<any[]>([]);
  const [query, setQuery] = React.useState("");
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isAuthenticated) return;
    if (role !== "master") return navigate("/");
    async function load() {
      const { data } = await supabase.from("characters").select("*").order("updated_at", { ascending: false });
      setList(data || []);
    }
    load();
  }, [role, isAuthenticated, navigate]);

  const filtered = list.filter((l) => (l.name || "").toLowerCase().includes(query.toLowerCase()) || ((l.crew || "").toLowerCase().includes(query.toLowerCase())));

  return (
    <>
      <h2 className="text-3xl font-display text-yellow-500 mb-4">Master Dashboard</h2>
      <div className="mb-4 flex gap-2">
        <div className="relative">
          <input className="border p-2 rounded pl-10" placeholder="Cerca per nome o ciurma" value={query} onChange={(e) => setQuery(e.target.value)} />
          <img src="/assets/icons/compass.svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 opacity-80" />
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <PirateCard key={s.id} className="p-4">
            <div className="flex items-center gap-3">
              <img src={s.image_url} alt="avatar" className="w-20 h-20 object-cover rounded" />
              <div>
                <div className="font-display text-lg">{s.name}</div>
                <div className="text-sm text-muted-foreground">{s.crew} · {s.job}</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <PirateButton onClick={() => navigate(`/view?userId=${encodeURIComponent(s.user_id)}`)}>Visualizza</PirateButton>
              <PirateButton onClick={() => navigate(`/edit?userId=${encodeURIComponent(s.user_id)}`)}>Modifica</PirateButton>
            </div>
          </PirateCard>
        ))}
      </div>
    </>
  );
}
