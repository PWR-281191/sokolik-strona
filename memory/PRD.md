# PRD — UKS Sokolik Niemodlin (strona klubu tenisa stołowego)

## Original Problem Statement
Zbudować stronę klubu tenisa stołowego UKS Sokolik Niemodlin: prostą, czytelną, tematycznie związaną z tenisem stołowym. 3 zakładki: Aktualności (posty/ogłoszenia + info z Facebooka), Liga (3. liga opolska — wyniki meczów + widok zawodników), Turniej Amatorów (wyniki turniejów + ranking indywidualny). Strona ma być rozbudowywalna przez panel administratora.

## User Choices
- Panel administratora z logowaniem (hasło) — tylko admin edytuje
- Aktualności: automatyczne pobieranie posta z FB + ręczne dodawanie treści/zdjęć
- Jasny motyw, kolory z logo (pomarańczowy #F08019 + granatowy #1F3A7A)
- Ranking: system punktowy
- Dane demonstracyjne na start

## Architecture
- Backend: FastAPI + MongoDB (motor). JWT Bearer auth (admin seed z .env). Kolekcje: users, posts, players, matches, tournaments.
- Frontend: React + Tailwind + shadcn/ui. Fonty Outfit/Chivo. Trasy: / (Aktualności), /liga, /turniej-amatorow, /admin.
- Ranking liczony automatycznie z sum punktów turniejowych (/api/ranking).

## Implemented (2026-07-05)
- Publiczne strony: Aktualności (hero + karty postów), Liga (zakładki: wyniki meczów / zawodnicy), Turniej Amatorów (ranking + karty turniejów).
- Panel admina: logowanie/wylogowanie, CRUD dla postów, zawodników, meczów, turniejów.
- Upload zdjęć (base64), przypinanie postów, best-effort pobieranie danych z FB (Open Graph).
- Dane demonstracyjne + admin seed. Testy E2E: 100% (backend 20/20, frontend wszystkie flow).

## Credentials
admin@sokolik.pl / Sokolik2025! (patrz /app/memory/test_credentials.md)

## Backlog / Next
- P1: Galeria zdjęć / wiele zdjęć w poście; strona pojedynczego posta.
- P2: Tabela ligowa drużyn (nie tylko zawodnicy), kalendarz nadchodzących meczów.
- P2: Prawdziwa integracja Facebook Graph API (wymaga tokenu strony FB).
- P2: Reset hasła admina, opcjonalne 400/404 handling w admin endpoints.
