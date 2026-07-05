import { useEffect, useState } from "react";
import { api, formatDate } from "@/lib/api";
import { Facebook, Pin, Newspaper } from "lucide-react";

const HERO = "https://images.unsplash.com/photo-1676827613262-5fba25cee5fd?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA4Mzl8MHwxfHNlYXJjaHwxfHx0YWJsZSUyMHRlbm5pcyUyMHBpbmclMjBwb25nJTIwbWF0Y2h8ZW58MHx8fHwxNzgzMjYwODQ3fDA&ixlib=rb-4.1.0&q=85";

const NewsCard = ({ post, big }) => (
  <article
    data-testid="news-card"
    className={`bg-white border-2 border-sokolik-navy/10 rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col ${
      big ? "md:col-span-8" : "md:col-span-4"
    }`}
  >
    {post.image && (
      <div className={`overflow-hidden bg-slate-100 ${big ? "h-64" : "h-44"}`}>
        <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
      </div>
    )}
    <div className="p-6 sm:p-8 flex flex-col flex-1">
      <div className="flex items-center gap-2 mb-3">
        {post.pinned && (
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-sokolik-orange">
            <Pin className="h-3 w-3" /> Przypięte
          </span>
        )}
        <span className="text-xs font-medium text-slate-400">{formatDate(post.created_at)}</span>
      </div>
      <h3 className={`font-heading font-bold text-sokolik-navy mb-3 ${big ? "text-2xl sm:text-3xl" : "text-xl"}`}>
        {post.title}
      </h3>
      <p className="text-slate-600 leading-relaxed flex-1 whitespace-pre-line">{post.content}</p>
      {post.facebook_url && (
        <a
          href={post.facebook_url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="fb-link-btn"
          className="mt-5 inline-flex items-center gap-2 self-start px-4 py-2 rounded-lg bg-sokolik-navy text-white text-sm font-bold hover:bg-sokolik-navy-dark transition-colors"
        >
          <Facebook className="h-4 w-4" /> Zobacz na Facebooku
        </a>
      )}
    </div>
  </article>
);

export default function Aktualnosci() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/posts").then((r) => setPosts(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-sokolik-navy overflow-hidden">
        <img src={HERO} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-sokolik-navy via-sokolik-navy/90 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 sm:py-32">
          <p className="overline mb-4 text-sokolik-orange">Klub tenisa stołowego</p>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-3xl">
            UKS Sokolik <span className="text-sokolik-orange">Niemodlin</span>
          </h1>
          <p className="mt-6 text-lg text-blue-100 max-w-2xl leading-relaxed">
            Najnowsze aktualności, wyniki meczów 3. ligi opolskiej oraz rankingi Turnieju Amatorów w jednym miejscu.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-16 sm:py-20">
        <div className="flex items-center gap-3 mb-10">
          <Newspaper className="h-7 w-7 text-sokolik-orange" />
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-sokolik-navy">Aktualności</h2>
        </div>

        {loading ? (
          <p className="text-slate-500">Ładowanie...</p>
        ) : posts.length === 0 ? (
          <p className="text-slate-500" data-testid="no-posts">Brak aktualności. Dodaj pierwszy post w panelu administratora.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8" data-testid="news-grid">
            {posts.map((p, i) => (
              <NewsCard key={p.id} post={p} big={i === 0} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
