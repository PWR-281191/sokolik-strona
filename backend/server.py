from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
from typing import List, Optional, Annotated
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import bcrypt
import jwt
import logging
import requests
import re

# ---------------------------------------------------------------- DB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

app = FastAPI(title="UKS Sokolik Niemodlin API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sokolik")

# ---------------------------------------------------------------- helpers
PyObjectId = Annotated[str, BeforeValidator(str)]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_admin(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Brak autoryzacji")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Uzytkownik nie istnieje")
        user = clean(user)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token wygasl")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Nieprawidlowy token")


# ---------------------------------------------------------------- models
class LoginInput(BaseModel):
    email: str
    password: str


class PostInput(BaseModel):
    title: str
    content: str
    image: Optional[str] = None
    facebook_url: Optional[str] = None
    pinned: bool = False


class PlayerInput(BaseModel):
    name: str
    photo: Optional[str] = None
    games: int = 0
    wins: int = 0
    losses: int = 0
    balls_won: int = 0
    balls_lost: int = 0
    points: int = 0
    number: Optional[int] = None


class MatchInput(BaseModel):
    date: str
    opponent: str
    location: str = "dom"  # dom / wyjazd
    our_score: int = 0
    opp_score: int = 0
    result: str = "W"  # W / L / D
    round: Optional[str] = None
    note: Optional[str] = None


class TournamentResult(BaseModel):
    player_name: str
    placement: int
    points: int


class TournamentInput(BaseModel):
    name: str
    date: str
    location: Optional[str] = None
    description: Optional[str] = None
    results: List[TournamentResult] = []


class FacebookFetchInput(BaseModel):
    url: str


# ---------------------------------------------------------------- auth routes
@api.post("/auth/login")
async def login(data: LoginInput):
    email = data.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Nieprawidlowy email lub haslo")
    token = create_access_token(str(user["_id"]), email)
    u = clean(user)
    u.pop("password_hash", None)
    return {"access_token": token, "user": u}


@api.get("/auth/me")
async def me(admin: dict = Depends(get_current_admin)):
    return admin


# ---------------------------------------------------------------- NEWS (public)
@api.get("/posts")
async def list_posts():
    docs = await db.posts.find().sort([("pinned", -1), ("created_at", -1)]).to_list(200)
    return [clean(d) for d in docs]


@api.get("/posts/{post_id}")
async def get_post(post_id: str):
    doc = await db.posts.find_one({"_id": ObjectId(post_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Nie znaleziono posta")
    return clean(doc)


# NEWS admin
@api.post("/admin/posts")
async def create_post(data: PostInput, admin: dict = Depends(get_current_admin)):
    doc = data.model_dump()
    doc["created_at"] = now_iso()
    res = await db.posts.insert_one(doc)
    return clean(await db.posts.find_one({"_id": res.inserted_id}))


@api.put("/admin/posts/{post_id}")
async def update_post(post_id: str, data: PostInput, admin: dict = Depends(get_current_admin)):
    await db.posts.update_one({"_id": ObjectId(post_id)}, {"$set": data.model_dump()})
    return clean(await db.posts.find_one({"_id": ObjectId(post_id)}))


@api.delete("/admin/posts/{post_id}")
async def delete_post(post_id: str, admin: dict = Depends(get_current_admin)):
    await db.posts.delete_one({"_id": ObjectId(post_id)})
    return {"ok": True}


@api.post("/admin/facebook-fetch")
async def facebook_fetch(data: FacebookFetchInput, admin: dict = Depends(get_current_admin)):
    """Best-effort fetch of Open Graph metadata from a public Facebook post URL."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; SokolikBot/1.0)"}
        r = requests.get(data.url, headers=headers, timeout=10)
        html = r.text

        def og(prop):
            m = re.search(
                r'<meta[^>]+property=["\']og:' + prop + r'["\'][^>]+content=["\']([^"\']+)["\']',
                html, re.IGNORECASE)
            if not m:
                m = re.search(
                    r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:' + prop + r'["\']',
                    html, re.IGNORECASE)
            return m.group(1) if m else None

        title = og("title") or "Post z Facebooka"
        desc = og("description") or ""
        image = og("image")
        return {
            "title": title,
            "content": desc,
            "image": image,
            "facebook_url": data.url,
            "warning": None if desc else "Nie udalo sie automatycznie pobrac tresci. Uzupelnij recznie.",
        }
    except Exception as e:
        logger.warning(f"FB fetch failed: {e}")
        raise HTTPException(status_code=400, detail="Nie udalo sie pobrac danych z Facebooka. Wklej tresc recznie.")


# ---------------------------------------------------------------- LEAGUE players (public)
@api.get("/players")
async def list_players():
    docs = await db.players.find().sort("points", -1).to_list(200)
    return [clean(d) for d in docs]


@api.post("/admin/players")
async def create_player(data: PlayerInput, admin: dict = Depends(get_current_admin)):
    res = await db.players.insert_one(data.model_dump())
    return clean(await db.players.find_one({"_id": res.inserted_id}))


@api.put("/admin/players/{pid}")
async def update_player(pid: str, data: PlayerInput, admin: dict = Depends(get_current_admin)):
    await db.players.update_one({"_id": ObjectId(pid)}, {"$set": data.model_dump()})
    return clean(await db.players.find_one({"_id": ObjectId(pid)}))


@api.delete("/admin/players/{pid}")
async def delete_player(pid: str, admin: dict = Depends(get_current_admin)):
    await db.players.delete_one({"_id": ObjectId(pid)})
    return {"ok": True}


# ---------------------------------------------------------------- MATCHES (public)
@api.get("/matches")
async def list_matches():
    docs = await db.matches.find().sort("date", -1).to_list(200)
    return [clean(d) for d in docs]


@api.post("/admin/matches")
async def create_match(data: MatchInput, admin: dict = Depends(get_current_admin)):
    res = await db.matches.insert_one(data.model_dump())
    return clean(await db.matches.find_one({"_id": res.inserted_id}))


@api.put("/admin/matches/{mid}")
async def update_match(mid: str, data: MatchInput, admin: dict = Depends(get_current_admin)):
    await db.matches.update_one({"_id": ObjectId(mid)}, {"$set": data.model_dump()})
    return clean(await db.matches.find_one({"_id": ObjectId(mid)}))


@api.delete("/admin/matches/{mid}")
async def delete_match(mid: str, admin: dict = Depends(get_current_admin)):
    await db.matches.delete_one({"_id": ObjectId(mid)})
    return {"ok": True}


# ---------------------------------------------------------------- TOURNAMENTS (public)
@api.get("/tournaments")
async def list_tournaments():
    docs = await db.tournaments.find().sort("date", -1).to_list(200)
    return [clean(d) for d in docs]


@api.get("/ranking")
async def ranking():
    """Cumulative individual ranking across all tournaments."""
    docs = await db.tournaments.find().to_list(500)
    agg = {}
    for t in docs:
        for res in t.get("results", []):
            name = res["player_name"]
            if name not in agg:
                agg[name] = {"player_name": name, "points": 0, "tournaments": 0, "best_placement": None}
            agg[name]["points"] += res.get("points", 0)
            agg[name]["tournaments"] += 1
            p = res.get("placement")
            if p and (agg[name]["best_placement"] is None or p < agg[name]["best_placement"]):
                agg[name]["best_placement"] = p
    rows = sorted(agg.values(), key=lambda x: (-x["points"], x["tournaments"]))
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    return rows


@api.post("/admin/tournaments")
async def create_tournament(data: TournamentInput, admin: dict = Depends(get_current_admin)):
    res = await db.tournaments.insert_one(data.model_dump())
    return clean(await db.tournaments.find_one({"_id": res.inserted_id}))


@api.put("/admin/tournaments/{tid}")
async def update_tournament(tid: str, data: TournamentInput, admin: dict = Depends(get_current_admin)):
    await db.tournaments.update_one({"_id": ObjectId(tid)}, {"$set": data.model_dump()})
    return clean(await db.tournaments.find_one({"_id": ObjectId(tid)}))


@api.delete("/admin/tournaments/{tid}")
async def delete_tournament(tid: str, admin: dict = Depends(get_current_admin)):
    await db.tournaments.delete_one({"_id": ObjectId(tid)})
    return {"ok": True}


@api.get("/")
async def root():
    return {"message": "UKS Sokolik Niemodlin API"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------- seed
async def seed():
    admin_email = os.environ["ADMIN_EMAIL"].strip().lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Administrator",
            "role": "admin",
            "created_at": now_iso(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})

    if await db.posts.count_documents({}) == 0:
        await db.posts.insert_many([
            {"title": "Zwyciestwo w meczu 3. ligi opolskiej!",
             "content": "Nasza pierwsza druzyna pokonala rywali 8:2 w emocjonujacym spotkaniu. Gratulujemy zawodnikom swietnej postawy i dziekujemy kibicom za doping!",
             "image": None, "facebook_url": "https://www.facebook.com/profile.php?id=100061688170027",
             "pinned": True, "created_at": now_iso()},
            {"title": "Zapisy na Turniej Amatorow - edycja wiosenna",
             "content": "Ruszyly zapisy na kolejna edycje Turnieju Amatorow UKS Sokolik. Turniej odbedzie sie w hali sportowej w Niemodlinie. Zapraszamy wszystkich milosnikow tenisa stolowego!",
             "image": None, "facebook_url": None, "pinned": False, "created_at": now_iso()},
            {"title": "Treningi dla dzieci i mlodziezy",
             "content": "Przypominamy o cotygodniowych treningach sekcji mlodziezowej. Zapraszamy nowych zawodnikow - pierwsze zajecia gratis!",
             "image": None, "facebook_url": None, "pinned": False, "created_at": now_iso()},
        ])

    if await db.players.count_documents({}) == 0:
        await db.players.insert_many([
            {"name": "Adam Kowalski", "photo": None, "number": 1, "games": 12, "wins": 9, "losses": 3, "balls_won": 34, "balls_lost": 18, "points": 9},
            {"name": "Piotr Nowak", "photo": None, "number": 2, "games": 12, "wins": 8, "losses": 4, "balls_won": 30, "balls_lost": 20, "points": 8},
            {"name": "Marek Wisniewski", "photo": None, "number": 3, "games": 11, "wins": 6, "losses": 5, "balls_won": 25, "balls_lost": 24, "points": 6},
            {"name": "Tomasz Zielinski", "photo": None, "number": 4, "games": 10, "wins": 5, "losses": 5, "balls_won": 22, "balls_lost": 23, "points": 5},
            {"name": "Krzysztof Lewandowski", "photo": None, "number": 5, "games": 9, "wins": 3, "losses": 6, "balls_won": 15, "balls_lost": 22, "points": 3},
        ])

    if await db.matches.count_documents({}) == 0:
        await db.matches.insert_many([
            {"date": "2026-05-18", "opponent": "LZS Chrzaszczyce", "location": "dom", "our_score": 8, "opp_score": 2, "result": "W", "round": "Kolejka 12", "note": "Pewne zwyciestwo u siebie."},
            {"date": "2026-05-11", "opponent": "UKS Otmuchow", "location": "wyjazd", "our_score": 4, "opp_score": 6, "result": "L", "round": "Kolejka 11", "note": "Wyrownany mecz na wyjezdzie."},
            {"date": "2026-05-04", "opponent": "MKS Nysa", "location": "dom", "our_score": 9, "opp_score": 1, "result": "W", "round": "Kolejka 10", "note": None},
            {"date": "2026-04-27", "opponent": "LKS Grodkow", "location": "wyjazd", "our_score": 7, "opp_score": 3, "result": "W", "round": "Kolejka 9", "note": None},
        ])

    if await db.tournaments.count_documents({}) == 0:
        await db.tournaments.insert_many([
            {"name": "Turniej Amatorow - I edycja", "date": "2026-02-15", "location": "Hala OSiR Niemodlin",
             "description": "Pierwszy turniej sezonu. Frekwencja dopisala!",
             "results": [
                 {"player_name": "Jan Amator", "placement": 1, "points": 25},
                 {"player_name": "Robert Grywalski", "placement": 2, "points": 20},
                 {"player_name": "Anna Rakietka", "placement": 3, "points": 16},
                 {"player_name": "Pawel Serwis", "placement": 4, "points": 13},
                 {"player_name": "Michal Topspin", "placement": 5, "points": 11},
             ]},
            {"name": "Turniej Amatorow - II edycja", "date": "2026-04-19", "location": "Hala OSiR Niemodlin",
             "description": "Zacieta rywalizacja w finale.",
             "results": [
                 {"player_name": "Robert Grywalski", "placement": 1, "points": 25},
                 {"player_name": "Jan Amator", "placement": 2, "points": 20},
                 {"player_name": "Michal Topspin", "placement": 3, "points": 16},
                 {"player_name": "Anna Rakietka", "placement": 4, "points": 13},
                 {"player_name": "Krzysztof Blok", "placement": 5, "points": 11},
             ]},
        ])
    logger.info("Seed complete.")


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await seed()


@app.on_event("shutdown")
async def shutdown():
    client.close()
