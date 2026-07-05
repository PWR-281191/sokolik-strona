"""Backend API tests for UKS Sokolik Niemodlin.

Covers:
- Public: /api/posts, /api/players, /api/matches, /api/tournaments, /api/ranking
- Auth: /api/auth/login (valid+invalid), /api/auth/me
- Admin CRUD: posts, players, matches, tournaments (create/update/delete+persistence)
- 401 protection on protected endpoints
- Ranking auto-computation from tournament results
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://sokolik-ping-pong.preview.emergentagent.com"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@sokolik.pl"
ADMIN_PASSWORD = "Sokolik2025!"


# ---------------------------------- fixtures
@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth_token(api_client):
    r = api_client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ---------------------------------- health / public
class TestPublic:
    def test_root(self, api_client):
        r = api_client.get(f"{API}/")
        assert r.status_code == 200
        assert "message" in r.json()

    def test_list_posts(self, api_client):
        r = api_client.get(f"{API}/posts")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # seeded
        assert "title" in data[0] and "content" in data[0] and "id" in data[0]

    def test_list_players_sorted_by_points(self, api_client):
        r = api_client.get(f"{API}/players")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        pts = [p["points"] for p in data]
        assert pts == sorted(pts, reverse=True), "Players not sorted by points desc"

    def test_list_matches(self, api_client):
        r = api_client.get(f"{API}/matches")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        m = data[0]
        for k in ("date", "opponent", "our_score", "opp_score", "result", "id"):
            assert k in m

    def test_list_tournaments(self, api_client):
        r = api_client.get(f"{API}/tournaments")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        t = data[0]
        assert "name" in t and "date" in t and "results" in t

    def test_ranking_aggregates(self, api_client):
        r = api_client.get(f"{API}/ranking")
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) >= 1
        # sorted desc by points and rank set
        for i, row in enumerate(rows, 1):
            assert row["rank"] == i
            assert "player_name" in row and "points" in row and "tournaments" in row
        pts = [r_["points"] for r_ in rows]
        assert pts == sorted(pts, reverse=True)


# ---------------------------------- auth
class TestAuth:
    def test_login_success(self, api_client):
        r = api_client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        j = r.json()
        assert "access_token" in j and isinstance(j["access_token"], str) and len(j["access_token"]) > 10
        assert j["user"]["email"] == ADMIN_EMAIL
        assert "password_hash" not in j["user"]

    def test_login_wrong_password(self, api_client):
        r = api_client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong!"})
        assert r.status_code == 401
        assert "detail" in r.json()

    def test_login_unknown_email(self, api_client):
        r = api_client.post(f"{API}/auth/login", json={"email": "nope@example.com", "password": "x"})
        assert r.status_code == 401

    def test_me_requires_token(self, api_client):
        r = api_client.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_valid(self, api_client, admin_headers):
        r = api_client.get(f"{API}/auth/me", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL


# ---------------------------------- 401 protection
class TestProtected:
    @pytest.mark.parametrize("method,path,body", [
        ("post", "/admin/posts", {"title": "x", "content": "y"}),
        ("post", "/admin/players", {"name": "x"}),
        ("post", "/admin/matches", {"date": "2026-01-01", "opponent": "x"}),
        ("post", "/admin/tournaments", {"name": "x", "date": "2026-01-01"}),
        ("delete", "/admin/posts/000000000000000000000000", None),
    ])
    def test_admin_endpoints_reject_no_token(self, api_client, method, path, body):
        fn = getattr(api_client, method)
        kwargs = {"json": body} if body else {}
        r = fn(f"{API}{path}", **kwargs)
        assert r.status_code == 401


# ---------------------------------- posts CRUD
class TestPostsCRUD:
    def test_create_update_delete_persistence(self, api_client, admin_headers):
        payload = {"title": "TEST_post_" + uuid.uuid4().hex[:6], "content": "Hello", "pinned": False}
        r = api_client.post(f"{API}/admin/posts", json=payload, headers=admin_headers)
        assert r.status_code == 200
        created = r.json()
        pid = created["id"]
        assert created["title"] == payload["title"]

        # GET via list
        listed = api_client.get(f"{API}/posts").json()
        assert any(p["id"] == pid for p in listed)

        # GET single
        one = api_client.get(f"{API}/posts/{pid}")
        assert one.status_code == 200 and one.json()["title"] == payload["title"]

        # UPDATE
        payload["title"] = payload["title"] + "_upd"
        r = api_client.put(f"{API}/admin/posts/{pid}", json=payload, headers=admin_headers)
        assert r.status_code == 200
        # verify persisted
        one = api_client.get(f"{API}/posts/{pid}").json()
        assert one["title"].endswith("_upd")

        # DELETE
        r = api_client.delete(f"{API}/admin/posts/{pid}", headers=admin_headers)
        assert r.status_code == 200
        # verify gone
        gone = api_client.get(f"{API}/posts/{pid}")
        assert gone.status_code == 404


# ---------------------------------- players CRUD
class TestPlayersCRUD:
    def test_create_update_delete(self, api_client, admin_headers):
        name = "TEST_player_" + uuid.uuid4().hex[:6]
        payload = {"name": name, "points": 5, "games": 3, "wins": 2, "losses": 1}
        r = api_client.post(f"{API}/admin/players", json=payload, headers=admin_headers)
        assert r.status_code == 200
        pid = r.json()["id"]

        listed = api_client.get(f"{API}/players").json()
        found = next((p for p in listed if p["id"] == pid), None)
        assert found and found["points"] == 5 and found["name"] == name

        r = api_client.put(f"{API}/admin/players/{pid}",
                           json={**payload, "points": 15}, headers=admin_headers)
        assert r.status_code == 200 and r.json()["points"] == 15

        listed = api_client.get(f"{API}/players").json()
        found = next((p for p in listed if p["id"] == pid), None)
        assert found and found["points"] == 15

        r = api_client.delete(f"{API}/admin/players/{pid}", headers=admin_headers)
        assert r.status_code == 200
        listed = api_client.get(f"{API}/players").json()
        assert not any(p["id"] == pid for p in listed)


# ---------------------------------- matches CRUD
class TestMatchesCRUD:
    def test_create_update_delete(self, api_client, admin_headers):
        payload = {"date": "2026-06-01", "opponent": "TEST_opp_" + uuid.uuid4().hex[:5],
                   "location": "dom", "our_score": 7, "opp_score": 3, "result": "W"}
        r = api_client.post(f"{API}/admin/matches", json=payload, headers=admin_headers)
        assert r.status_code == 200
        mid = r.json()["id"]

        listed = api_client.get(f"{API}/matches").json()
        found = next((m for m in listed if m["id"] == mid), None)
        assert found and found["opponent"] == payload["opponent"] and found["our_score"] == 7

        payload["our_score"] = 9
        r = api_client.put(f"{API}/admin/matches/{mid}", json=payload, headers=admin_headers)
        assert r.status_code == 200 and r.json()["our_score"] == 9

        r = api_client.delete(f"{API}/admin/matches/{mid}", headers=admin_headers)
        assert r.status_code == 200
        assert not any(m["id"] == mid for m in api_client.get(f"{API}/matches").json())


# ---------------------------------- tournaments CRUD + ranking effect
class TestTournamentsCRUD:
    def test_create_updates_ranking(self, api_client, admin_headers):
        marker = "TEST_pl_" + uuid.uuid4().hex[:6]
        tpayload = {
            "name": "TEST_tournament_" + uuid.uuid4().hex[:5],
            "date": "2026-06-15",
            "location": "Hala",
            "description": "Test",
            "results": [
                {"player_name": marker, "placement": 1, "points": 25},
                {"player_name": marker + "_B", "placement": 2, "points": 20},
            ],
        }
        r = api_client.post(f"{API}/admin/tournaments", json=tpayload, headers=admin_headers)
        assert r.status_code == 200
        tid = r.json()["id"]
        assert len(r.json()["results"]) == 2

        # Ranking should include our marker with 25 pts
        rank = api_client.get(f"{API}/ranking").json()
        entry = next((row for row in rank if row["player_name"] == marker), None)
        assert entry and entry["points"] == 25 and entry["best_placement"] == 1

        # Create second tournament with same player -> cumulative 25+15=40
        t2 = {
            "name": "TEST_tour2_" + uuid.uuid4().hex[:5], "date": "2026-06-20",
            "results": [{"player_name": marker, "placement": 3, "points": 15}],
        }
        r2 = api_client.post(f"{API}/admin/tournaments", json=t2, headers=admin_headers)
        assert r2.status_code == 200
        tid2 = r2.json()["id"]

        rank = api_client.get(f"{API}/ranking").json()
        entry = next((row for row in rank if row["player_name"] == marker), None)
        assert entry and entry["points"] == 40 and entry["tournaments"] == 2 and entry["best_placement"] == 1

        # Update
        tpayload["name"] = tpayload["name"] + "_upd"
        r = api_client.put(f"{API}/admin/tournaments/{tid}", json=tpayload, headers=admin_headers)
        assert r.status_code == 200 and r.json()["name"].endswith("_upd")

        # Cleanup
        for x in (tid, tid2):
            api_client.delete(f"{API}/admin/tournaments/{x}", headers=admin_headers)

        # Verify removed from ranking
        rank = api_client.get(f"{API}/ranking").json()
        assert not any(row["player_name"] == marker for row in rank)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
