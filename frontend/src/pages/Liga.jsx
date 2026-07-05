import { useEffect, useState } from "react";
import { api, formatDate } from "@/lib/api";
import { Trophy, Users, Home, Plane, Swords } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const ResultBadge = ({ result }) => {
  const map = {
    W: { label: "Wygrana", cls: "bg-sokolik-orange text-white" },
    L: { label: "Porażka", cls: "bg-sokolik-navy text-white" },
    D: { label: "Remis", cls: "bg-slate-400 text-white" },
  };
  const r = map[result] || map.D;
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${r.cls}`}>{r.label}</span>;
};

export default function Liga() {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    api.get("/players").then((r) => setPlayers(r.data));
    api.get("/matches").then((r) => setMatches(r.data));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 sm:py-20">
      <p className="overline mb-3">3. Liga Opolska</p>
      <h1 className="font-heading text-4xl sm:text-5xl font-black text-sokolik-navy mb-4">Liga</h1>
      <p className="text-slate-600 max-w-2xl mb-10">
        Nasza pierwsza drużyna rywalizuje w 3. lidze opolskiej. Poniżej znajdziesz wyniki meczów oraz statystyki zawodników.
      </p>

      <Tabs defaultValue="wyniki" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-lg mb-8">
          <TabsTrigger value="wyniki" data-testid="league-tab-results" className="data-[state=active]:bg-sokolik-navy data-[state=active]:text-white rounded-md px-5 py-2 font-bold text-sm">
            <Swords className="h-4 w-4 mr-2" /> Wyniki meczów
          </TabsTrigger>
          <TabsTrigger value="zawodnicy" data-testid="league-tab-players" className="data-[state=active]:bg-sokolik-navy data-[state=active]:text-white rounded-md px-5 py-2 font-bold text-sm">
            <Users className="h-4 w-4 mr-2" /> Zawodnicy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wyniki">
          <div className="space-y-4" data-testid="matches-list">
            {matches.length === 0 && <p className="text-slate-500">Brak wyników meczów.</p>}
            {matches.map((m) => (
              <div key={m.id} data-testid="match-card" className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 sm:w-40">
                  {m.location === "dom" ? <Home className="h-4 w-4 text-sokolik-orange" /> : <Plane className="h-4 w-4 text-sokolik-navy" />}
                  {formatDate(m.date)}
                </div>
                <div className="flex-1 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-heading font-bold text-sokolik-navy text-lg">UKS Sokolik vs {m.opponent}</p>
                    <p className="text-xs text-slate-400">{m.round} · {m.location === "dom" ? "u siebie" : "na wyjeździe"}</p>
                  </div>
                  <div className="text-2xl font-black font-heading text-sokolik-navy tabular-nums">
                    {m.our_score}:{m.opp_score}
                  </div>
                </div>
                <ResultBadge result={m.result} />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="zawodnicy">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto" data-testid="players-table">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 border-y-2 border-sokolik-navy text-sokolik-navy">
                  <th className="py-3 px-4 font-bold">#</th>
                  <th className="py-3 px-4 font-bold">Zawodnik</th>
                  <th className="py-3 px-4 font-bold text-center">Mecze</th>
                  <th className="py-3 px-4 font-bold text-center">W</th>
                  <th className="py-3 px-4 font-bold text-center">P</th>
                  <th className="py-3 px-4 font-bold text-center">Bilans setów</th>
                  <th className="py-3 px-4 font-bold text-center">Punkty</th>
                </tr>
              </thead>
              <tbody>
                {players.length === 0 && (
                  <tr><td colSpan={7} className="py-6 px-4 text-slate-500">Brak zawodników.</td></tr>
                )}
                {players.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-400">{p.number ?? "-"}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {p.photo ? (
                          <img src={p.photo} alt={p.name} className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-sokolik-navy/10 flex items-center justify-center text-sokolik-navy font-bold text-sm">
                            {p.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-semibold text-sokolik-navy">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums">{p.games}</td>
                    <td className="py-3 px-4 text-center tabular-nums font-bold text-sokolik-orange">{p.wins}</td>
                    <td className="py-3 px-4 text-center tabular-nums">{p.losses}</td>
                    <td className="py-3 px-4 text-center tabular-nums text-slate-500">{p.balls_won}:{p.balls_lost}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-black text-sokolik-navy">
                        <Trophy className="h-3.5 w-3.5 text-sokolik-orange" />{p.points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
