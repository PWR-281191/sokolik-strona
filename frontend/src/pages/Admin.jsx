import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiErrorDetail, formatDate } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Newspaper, Users, Swords, Trophy, LogOut, Plus, Trash2, Pencil, Shield, X, Facebook, Download,
} from "lucide-react";

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/* ---------------------------------------------------------------- Login */
function LoginGate() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      toast.success("Zalogowano pomyślnie");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <form onSubmit={submit} data-testid="login-form" className="w-full max-w-md bg-white border-2 border-sokolik-navy/10 rounded-2xl p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-sokolik-orange flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-sokolik-navy">Panel Administratora</h1>
            <p className="text-sm text-slate-500">UKS Sokolik Niemodlin</p>
          </div>
        </div>
        {error && <p data-testid="login-error" className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" data-testid="login-email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Hasło</Label>
            <Input id="password" type="password" data-testid="login-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" />
          </div>
          <Button type="submit" data-testid="login-submit" disabled={loading} className="w-full bg-sokolik-orange hover:bg-sokolik-orange-dark text-white font-bold">
            {loading ? "Logowanie..." : "Zaloguj się"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------- generic modal */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center overflow-y-auto p-4 py-10" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="admin-modal">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading text-xl font-bold text-sokolik-navy">{title}</h3>
          <button onClick={onClose} data-testid="modal-close"><X className="h-5 w-5 text-slate-400 hover:text-slate-700" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Posts */
function PostsManager() {
  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(null);
  const empty = { title: "", content: "", image: null, facebook_url: "", pinned: false };
  const [form, setForm] = useState(empty);
  const [fbUrl, setFbUrl] = useState("");
  const [fetching, setFetching] = useState(false);

  const load = () => api.get("/posts").then((r) => setPosts(r.data));
  useEffect(() => { load(); }, []);

  const open = (p) => { setEditing(p || "new"); setForm(p ? { ...p } : empty); };
  const close = () => { setEditing(null); setForm(empty); setFbUrl(""); };

  const onImage = async (e) => {
    const f = e.target.files[0];
    if (f) { const b64 = await fileToBase64(f); setForm((s) => ({ ...s, image: b64 })); }
  };

  const fetchFb = async () => {
    if (!fbUrl) return;
    setFetching(true);
    try {
      const { data } = await api.post("/admin/facebook-fetch", { url: fbUrl });
      setForm((s) => ({ ...s, title: data.title || s.title, content: data.content || s.content, image: data.image || s.image, facebook_url: data.facebook_url }));
      toast[data.warning ? "warning" : "success"](data.warning || "Pobrano dane z Facebooka");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setFetching(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing === "new") await api.post("/admin/posts", form);
      else await api.put(`/admin/posts/${editing.id}`, form);
      toast.success("Zapisano post");
      close(); load();
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail)); }
  };

  const remove = async (id) => {
    if (!window.confirm("Usunąć ten post?")) return;
    await api.delete(`/admin/posts/${id}`);
    toast.success("Usunięto"); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-2xl font-bold text-sokolik-navy">Aktualności</h2>
        <Button onClick={() => open(null)} data-testid="add-post-btn" className="bg-sokolik-orange hover:bg-sokolik-orange-dark text-white font-bold"><Plus className="h-4 w-4 mr-1" /> Dodaj post</Button>
      </div>
      <div className="space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-4">
            <div>
              <p className="font-semibold text-sokolik-navy">{p.title} {p.pinned && <span className="text-xs text-sokolik-orange">(przypięte)</span>}</p>
              <p className="text-xs text-slate-400">{formatDate(p.created_at)}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => open(p)} data-testid="edit-post-btn" className="p-2 text-slate-500 hover:text-sokolik-navy"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(p.id)} data-testid="delete-post-btn" className="p-2 text-slate-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing === "new" ? "Nowy post" : "Edytuj post"} onClose={close}>
          <form onSubmit={save} className="space-y-4" data-testid="post-form">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <Label className="flex items-center gap-2 text-sokolik-navy"><Facebook className="h-4 w-4" /> Pobierz z Facebooka (opcjonalnie)</Label>
              <div className="flex gap-2 mt-2">
                <Input placeholder="Wklej link do posta na Facebooku" value={fbUrl} onChange={(e) => setFbUrl(e.target.value)} data-testid="fb-fetch-input" />
                <Button type="button" onClick={fetchFb} disabled={fetching} data-testid="fb-fetch-btn" className="bg-sokolik-navy hover:bg-sokolik-navy-dark text-white shrink-0"><Download className="h-4 w-4 mr-1" />{fetching ? "..." : "Pobierz"}</Button>
              </div>
            </div>
            <div><Label>Tytuł</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required data-testid="post-title" className="mt-1" /></div>
            <div><Label>Treść</Label><Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required data-testid="post-content" className="mt-1" /></div>
            <div><Label>Zdjęcie</Label><Input type="file" accept="image/*" onChange={onImage} className="mt-1" data-testid="post-image" />{form.image && <img src={form.image} alt="" className="mt-2 h-24 rounded-lg object-cover" />}</div>
            <div><Label>Link do Facebooka (opcjonalnie)</Label><Input value={form.facebook_url || ""} onChange={(e) => setForm({ ...form, facebook_url: e.target.value })} className="mt-1" /></div>
            <label className="flex items-center gap-2 text-sm font-medium text-sokolik-navy"><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} data-testid="post-pinned" /> Przypnij na górze</label>
            <Button type="submit" data-testid="post-save" className="w-full bg-sokolik-orange hover:bg-sokolik-orange-dark text-white font-bold">Zapisz</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Players */
function PlayersManager() {
  const [players, setPlayers] = useState([]);
  const [editing, setEditing] = useState(null);
  const empty = { name: "", photo: null, number: "", games: 0, wins: 0, losses: 0, balls_won: 0, balls_lost: 0, points: 0 };
  const [form, setForm] = useState(empty);
  const load = () => api.get("/players").then((r) => setPlayers(r.data));
  useEffect(() => { load(); }, []);

  const open = (p) => { setEditing(p || "new"); setForm(p ? { ...p, number: p.number ?? "" } : empty); };
  const num = (v) => (v === "" ? 0 : parseInt(v, 10) || 0);

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, number: form.number === "" ? null : num(form.number), games: num(form.games), wins: num(form.wins), losses: num(form.losses), balls_won: num(form.balls_won), balls_lost: num(form.balls_lost), points: num(form.points) };
    try {
      if (editing === "new") await api.post("/admin/players", payload);
      else await api.put(`/admin/players/${editing.id}`, payload);
      toast.success("Zapisano zawodnika"); setEditing(null); load();
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail)); }
  };
  const remove = async (id) => { if (!window.confirm("Usunąć zawodnika?")) return; await api.delete(`/admin/players/${id}`); toast.success("Usunięto"); load(); };
  const onPhoto = async (e) => { const f = e.target.files[0]; if (f) { const b64 = await fileToBase64(f); setForm((s) => ({ ...s, photo: b64 })); } };

  const fields = [["number", "Numer"], ["games", "Mecze"], ["wins", "Wygrane"], ["losses", "Porażki"], ["balls_won", "Sety wygrane"], ["balls_lost", "Sety przegrane"], ["points", "Punkty"]];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-2xl font-bold text-sokolik-navy">Zawodnicy (Liga)</h2>
        <Button onClick={() => open(null)} data-testid="add-player-btn" className="bg-sokolik-orange hover:bg-sokolik-orange-dark text-white font-bold"><Plus className="h-4 w-4 mr-1" /> Dodaj</Button>
      </div>
      <div className="space-y-3">
        {players.map((p) => (
          <div key={p.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-4">
            <p className="font-semibold text-sokolik-navy">{p.name} <span className="text-xs text-slate-400">· {p.points} pkt</span></p>
            <div className="flex gap-2">
              <button onClick={() => open(p)} data-testid="edit-player-btn" className="p-2 text-slate-500 hover:text-sokolik-navy"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(p.id)} data-testid="delete-player-btn" className="p-2 text-slate-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <Modal title={editing === "new" ? "Nowy zawodnik" : "Edytuj zawodnika"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4" data-testid="player-form">
            <div><Label>Imię i nazwisko</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="player-name" className="mt-1" /></div>
            <div><Label>Zdjęcie (opcjonalnie)</Label><Input type="file" accept="image/*" onChange={onPhoto} className="mt-1" />{form.photo && <img src={form.photo} alt="" className="mt-2 h-16 w-16 rounded-full object-cover" />}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {fields.map(([k, label]) => (
                <div key={k}><Label className="text-xs">{label}</Label><Input type="number" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1" /></div>
              ))}
            </div>
            <Button type="submit" data-testid="player-save" className="w-full bg-sokolik-orange hover:bg-sokolik-orange-dark text-white font-bold">Zapisz</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Matches */
function MatchesManager() {
  const [matches, setMatches] = useState([]);
  const [editing, setEditing] = useState(null);
  const empty = { date: "", opponent: "", location: "dom", our_score: 0, opp_score: 0, result: "W", round: "", note: "" };
  const [form, setForm] = useState(empty);
  const load = () => api.get("/matches").then((r) => setMatches(r.data));
  useEffect(() => { load(); }, []);
  const num = (v) => (v === "" ? 0 : parseInt(v, 10) || 0);

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, our_score: num(form.our_score), opp_score: num(form.opp_score) };
    try {
      if (editing === "new") await api.post("/admin/matches", payload);
      else await api.put(`/admin/matches/${editing.id}`, payload);
      toast.success("Zapisano mecz"); setEditing(null); load();
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail)); }
  };
  const remove = async (id) => { if (!window.confirm("Usunąć mecz?")) return; await api.delete(`/admin/matches/${id}`); toast.success("Usunięto"); load(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-2xl font-bold text-sokolik-navy">Wyniki meczów</h2>
        <Button onClick={() => { setEditing("new"); setForm(empty); }} data-testid="add-match-btn" className="bg-sokolik-orange hover:bg-sokolik-orange-dark text-white font-bold"><Plus className="h-4 w-4 mr-1" /> Dodaj mecz</Button>
      </div>
      <div className="space-y-3">
        {matches.map((m) => (
          <div key={m.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-4">
            <p className="font-semibold text-sokolik-navy">vs {m.opponent} <span className="text-sokolik-orange">{m.our_score}:{m.opp_score}</span> <span className="text-xs text-slate-400">· {formatDate(m.date)}</span></p>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(m); setForm({ ...m, round: m.round || "", note: m.note || "" }); }} data-testid="edit-match-btn" className="p-2 text-slate-500 hover:text-sokolik-navy"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(m.id)} data-testid="delete-match-btn" className="p-2 text-slate-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <Modal title={editing === "new" ? "Nowy mecz" : "Edytuj mecz"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4" data-testid="match-form">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required data-testid="match-date" className="mt-1" /></div>
              <div><Label>Kolejka</Label><Input value={form.round} onChange={(e) => setForm({ ...form, round: e.target.value })} className="mt-1" placeholder="np. Kolejka 12" /></div>
            </div>
            <div><Label>Przeciwnik</Label><Input value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} required data-testid="match-opponent" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nasz wynik</Label><Input type="number" value={form.our_score} onChange={(e) => setForm({ ...form, our_score: e.target.value })} className="mt-1" /></div>
              <div><Label>Wynik przeciwnika</Label><Input type="number" value={form.opp_score} onChange={(e) => setForm({ ...form, opp_score: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Miejsce</Label>
                <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input px-3 text-sm">
                  <option value="dom">Dom</option><option value="wyjazd">Wyjazd</option>
                </select>
              </div>
              <div><Label>Rezultat</Label>
                <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} data-testid="match-result" className="mt-1 w-full h-10 rounded-md border border-input px-3 text-sm">
                  <option value="W">Wygrana</option><option value="L">Porażka</option><option value="D">Remis</option>
                </select>
              </div>
            </div>
            <div><Label>Notatka (opcjonalnie)</Label><Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="mt-1" /></div>
            <Button type="submit" data-testid="match-save" className="w-full bg-sokolik-orange hover:bg-sokolik-orange-dark text-white font-bold">Zapisz</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Tournaments */
function TournamentsManager() {
  const [tournaments, setTournaments] = useState([]);
  const [editing, setEditing] = useState(null);
  const empty = { name: "", date: "", location: "", description: "", results: [] };
  const [form, setForm] = useState(empty);
  const load = () => api.get("/tournaments").then((r) => setTournaments(r.data));
  useEffect(() => { load(); }, []);

  const addRow = () => setForm((s) => ({ ...s, results: [...s.results, { player_name: "", placement: s.results.length + 1, points: 0 }] }));
  const updRow = (i, k, v) => setForm((s) => { const r = [...s.results]; r[i] = { ...r[i], [k]: k === "player_name" ? v : (parseInt(v, 10) || 0) }; return { ...s, results: r }; });
  const delRow = (i) => setForm((s) => ({ ...s, results: s.results.filter((_, idx) => idx !== i) }));

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing === "new") await api.post("/admin/tournaments", form);
      else await api.put(`/admin/tournaments/${editing.id}`, form);
      toast.success("Zapisano turniej"); setEditing(null); load();
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail)); }
  };
  const remove = async (id) => { if (!window.confirm("Usunąć turniej?")) return; await api.delete(`/admin/tournaments/${id}`); toast.success("Usunięto"); load(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-2xl font-bold text-sokolik-navy">Turnieje Amatorów</h2>
        <Button onClick={() => { setEditing("new"); setForm(empty); }} data-testid="add-tournament-btn" className="bg-sokolik-orange hover:bg-sokolik-orange-dark text-white font-bold"><Plus className="h-4 w-4 mr-1" /> Dodaj turniej</Button>
      </div>
      <p className="text-sm text-slate-500 mb-4">Ranking indywidualny jest liczony automatycznie na podstawie punktów przypisanych zawodnikom w turniejach.</p>
      <div className="space-y-3">
        {tournaments.map((t) => (
          <div key={t.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-4">
            <p className="font-semibold text-sokolik-navy">{t.name} <span className="text-xs text-slate-400">· {formatDate(t.date)} · {(t.results || []).length} zawodników</span></p>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(t); setForm({ ...t, location: t.location || "", description: t.description || "", results: t.results || [] }); }} data-testid="edit-tournament-btn" className="p-2 text-slate-500 hover:text-sokolik-navy"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(t.id)} data-testid="delete-tournament-btn" className="p-2 text-slate-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <Modal title={editing === "new" ? "Nowy turniej" : "Edytuj turniej"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4" data-testid="tournament-form">
            <div><Label>Nazwa turnieju</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="tournament-name" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required data-testid="tournament-date" className="mt-1" /></div>
              <div><Label>Miejsce</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1" /></div>
            </div>
            <div><Label>Opis (opcjonalnie)</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
            <div>
              <div className="flex items-center justify-between mb-2"><Label>Wyniki zawodników</Label><Button type="button" onClick={addRow} data-testid="add-result-row" size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Dodaj</Button></div>
              <div className="space-y-2">
                {form.results.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-6" placeholder="Zawodnik" value={r.player_name} onChange={(e) => updRow(i, "player_name", e.target.value)} data-testid="result-name" />
                    <Input className="col-span-2" type="number" placeholder="Miejsce" value={r.placement} onChange={(e) => updRow(i, "placement", e.target.value)} />
                    <Input className="col-span-3" type="number" placeholder="Punkty" value={r.points} onChange={(e) => updRow(i, "points", e.target.value)} data-testid="result-points" />
                    <button type="button" onClick={() => delRow(i)} className="col-span-1 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" data-testid="tournament-save" className="w-full bg-sokolik-orange hover:bg-sokolik-orange-dark text-white font-bold">Zapisz</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Admin shell */
export default function Admin() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState("posts");

  if (loading) return <div className="py-32 text-center text-slate-500">Ładowanie...</div>;
  if (!user) return <LoginGate />;

  const tabs = [
    { id: "posts", label: "Aktualności", icon: Newspaper, comp: <PostsManager /> },
    { id: "players", label: "Zawodnicy", icon: Users, comp: <PlayersManager /> },
    { id: "matches", label: "Mecze", icon: Swords, comp: <MatchesManager /> },
    { id: "tournaments", label: "Turnieje", icon: Trophy, comp: <TournamentsManager /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="overline">Panel Administratora</p>
          <h1 className="font-heading text-3xl font-black text-sokolik-navy">Zarządzanie treścią</h1>
        </div>
        <Button onClick={logout} data-testid="logout-btn" variant="outline" className="border-sokolik-navy text-sokolik-navy font-bold"><LogOut className="h-4 w-4 mr-2" /> Wyloguj</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto" data-testid="admin-sidebar">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} data-testid={`admin-tab-${t.id}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${tab === t.id ? "bg-sokolik-navy text-white" : "text-sokolik-navy hover:bg-slate-100"}`}>
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </nav>
        </aside>
        <section className="lg:col-span-3">
          {tabs.find((t) => t.id === tab)?.comp}
        </section>
      </div>
    </div>
  );
}
