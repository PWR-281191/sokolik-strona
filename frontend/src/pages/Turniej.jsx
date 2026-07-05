import { useEffect, useState } from "react";
import { api, formatDate } from "@/lib/api";
import { Medal, MapPin, CalendarDays, Award } from "lucide-react";

const medalColor = (rank) =>
  rank === 1 ? "bg-yellow-400 text-yellow-900"
  : rank === 2 ? "bg-slate-300 text-slate-700"
  : rank === 3 ? "bg-amber-600 text-white"
  : "bg-slate-100 text-slate-500";

export default function Turniej() {
  const [ranking, setRanking] = useState([]);
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    api.get("/ranking").then((r) => setRanking(r.data));
    api.get("/tournaments").then((r) => setTournaments(r.data));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 sm:py-20">
      <p className="overline mb-3">Rywalizacja indywidualna</p>
      <h1 className="font-heading text-4xl sm:text-5xl font-black text-sokolik-navy mb-4">Turniej Amatorów</h1>
      <p className="text-slate-600 max-w-2xl mb-12">
        Wyniki poszczególnych zawodów oraz zbiorczy ranking indywidualny liczony na podstawie punktów zdobytych we wszystkich turniejach.
      </p>

      {/* Ranking */}
      <div className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <Award className="h-6 w-6 text-sokolik-orange" />
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-sokolik-navy">Ranking indywidualny</h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto" data-testid="ranking-table">
          <table className="w-full text-left border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-slate-50 border-y-2 border-sokolik-navy text-sokolik-navy">
                <th className="py-3 px-4 font-bold text-center w-16">Poz.</th>
                <th className="py-3 px-4 font-bold">Zawodnik</th>
                <th className="py-3 px-4 font-bold text-center">Turnieje</th>
                <th className="py-3 px-4 font-bold text-center">Najlepsze miejsce</th>
                <th className="py-3 px-4 font-bold text-center">Punkty</th>
              </tr>
            </thead>
            <tbody>
              {ranking.length === 0 && (
                <tr><td colSpan={5} className="py-6 px-4 text-slate-500">Brak danych rankingowych.</td></tr>
              )}
              {ranking.map((r) => (
                <tr key={r.player_name} data-testid="ranking-row" className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full font-black text-sm ${medalColor(r.rank)}`}>
                      {r.rank}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-sokolik-navy">{r.player_name}</td>
                  <td className="py-3 px-4 text-center tabular-nums text-slate-500">{r.tournaments}</td>
                  <td className="py-3 px-4 text-center tabular-nums text-slate-500">{r.best_placement ?? "-"}</td>
                  <td className="py-3 px-4 text-center font-black text-lg text-sokolik-orange tabular-nums">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tournaments */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Medal className="h-6 w-6 text-sokolik-orange" />
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-sokolik-navy">Wyniki turniejów</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="tournaments-list">
          {tournaments.length === 0 && <p className="text-slate-500">Brak turniejów.</p>}
          {tournaments.map((t) => (
            <div key={t.id} data-testid="tournament-card" className="bg-white border-2 border-sokolik-navy/10 rounded-xl p-6 shadow-sm">
              <h3 className="font-heading font-bold text-xl text-sokolik-navy">{t.name}</h3>
              <div className="flex flex-wrap gap-4 mt-2 mb-4 text-xs font-medium text-slate-400">
                <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(t.date)}</span>
                {t.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {t.location}</span>}
              </div>
              {t.description && <p className="text-sm text-slate-600 mb-4">{t.description}</p>}
              <div className="space-y-1">
                {(t.results || []).slice().sort((a, b) => a.placement - b.placement).map((res, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0 text-sm">
                    <span className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-bold text-xs ${medalColor(res.placement)}`}>{res.placement}</span>
                      <span className="font-semibold text-sokolik-navy">{res.player_name}</span>
                    </span>
                    <span className="font-bold text-sokolik-orange tabular-nums">{res.points} pkt</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
