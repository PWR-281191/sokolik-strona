import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, Shield } from "lucide-react";
import { LOGO_URL } from "@/lib/api";

const links = [
  { to: "/", label: "Aktualności", end: true },
  { to: "/liga", label: "Liga" },
  { to: "/turniej-amatorow", label: "Turniej Amatorów" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-colors ${
      isActive ? "bg-sokolik-navy text-white" : "text-sokolik-navy hover:bg-slate-100"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white md:bg-white/85 md:backdrop-blur-xl border-b border-sokolik-navy/10 shadow-sm transform-gpu">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3" data-testid="nav-logo">
            <img src={LOGO_URL} alt="UKS Sokolik Niemodlin" className="h-14 w-auto object-contain" />
          </Link>

          <nav className="hidden md:flex items-center gap-1" data-testid="desktop-nav">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass} data-testid={`nav-${l.to}`}>
                {l.label}
              </NavLink>
            ))}
            <Link
              to="/admin"
              data-testid="nav-admin"
              className="ml-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-sokolik-orange hover:bg-sokolik-orange-dark transition-colors"
            >
              <Shield className="h-4 w-4" /> Panel
            </Link>
          </nav>

          <button
            className="md:hidden text-sokolik-navy"
            onClick={() => setOpen(!open)}
            data-testid="mobile-menu-toggle"
          >
            {open ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
          </button>
        </div>
      </div>

      {open && (
        <div
          key="mobile-nav-panel"
          className="md:hidden relative isolate transform-gpu border-t border-slate-100 bg-white px-6 py-4 space-y-2"
          data-testid="mobile-nav"
        >
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block w-full px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-colors ${
                  isActive ? "bg-sokolik-navy text-white" : "text-sokolik-navy hover:bg-slate-100"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <Link
            to="/admin"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-sokolik-orange"
          >
            <Shield className="h-4 w-4" /> Panel Administratora
          </Link>
        </div>
      )}
    </header>
  );
};
