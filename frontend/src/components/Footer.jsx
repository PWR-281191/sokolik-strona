import { LOGO_URL } from "@/lib/api";
import { Facebook, MapPin } from "lucide-react";

export const Footer = () => (
  <footer className="bg-sokolik-navy text-white mt-20">
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div>
        <img src={LOGO_URL} alt="UKS Sokolik" className="h-16 w-auto object-contain bg-white rounded-lg p-2 mb-4" />
        <p className="text-sm text-blue-100 leading-relaxed">
          Uczniowski Klub Sportowy Sokolik Niemodlin — sekcja tenisa stołowego.
          Gramy, trenujemy i wygrywamy razem.
        </p>
      </div>
      <div>
        <h4 className="font-heading font-bold text-lg mb-4 text-sokolik-orange">Kontakt</h4>
        <p className="flex items-center gap-2 text-sm text-blue-100 mb-2">
          <MapPin className="h-4 w-4" /> Niemodlin, woj. opolskie
        </p>
        <a
          href="https://www.facebook.com/profile.php?id=100061688170027&locale=pl_PL"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-blue-100 hover:text-sokolik-orange transition-colors"
          data-testid="footer-fb-link"
        >
          <Facebook className="h-4 w-4" /> Znajdź nas na Facebooku
        </a>
      </div>
      <div>
        <h4 className="font-heading font-bold text-lg mb-4 text-sokolik-orange">Rozgrywki</h4>
        <p className="text-sm text-blue-100">3. Liga Opolska</p>
        <p className="text-sm text-blue-100">Turniej Amatorów</p>
      </div>
    </div>
    <div className="border-t border-white/10 py-4 text-center text-xs text-blue-200">
      © {new Date().getFullYear()} UKS Sokolik Niemodlin. Wszelkie prawa zastrzeżone.
    </div>
  </footer>
);
