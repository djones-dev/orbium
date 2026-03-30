"""
Presets API integration tests.

Covers listing, creation, update, delete, and protection rules for
default/system presets.
"""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import preset_payload


class TestListPresets:
    def test_returns_list(self, client: TestClient):
        resp = client.get("/api/presets")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_default_presets_seeded(self, client: TestClient):
        # Default presets are seeded via seed_defaults in conftest
        resp = client.get("/api/presets")
        items = resp.json()
        assert len(items) > 0

    def test_each_item_has_required_fields(self, client: TestClient):
        items = client.get("/api/presets").json()
        for item in items:
            for field in ("id", "name", "type", "category", "parameters", "is_default"):
                assert field in item, f"missing field: {field}"

    def test_filter_by_type(self, client: TestClient):
        client.post("/api/presets", json=preset_payload(type="generator"))
        client.post("/api/presets", json=preset_payload(type="modulator"))
        resp = client.get("/api/presets?type=modulator")
        assert resp.status_code == 200
        for item in resp.json():
            assert item["type"] == "modulator"

    def test_filter_by_category(self, client: TestClient):
        client.post("/api/presets", json=preset_payload(category="moon"))
        resp = client.get("/api/presets?category=moon")
        assert resp.status_code == 200
        for item in resp.json():
            assert item["category"] == "moon"

    def test_sort_by_name_asc(self, client: TestClient):
        client.post("/api/presets", json=preset_payload(name="Zebra"))
        client.post("/api/presets", json=preset_payload(name="Alpha"))
        items = client.get("/api/presets?sort_by=name&order=asc").json()
        names = [i["name"] for i in items]
        assert names == sorted(names)


class TestGetDefaults:
    def test_returns_only_default_presets(self, client: TestClient):
        items = client.get("/api/presets/defaults").json()
        assert len(items) > 0
        for item in items:
            assert item["is_default"] is True


class TestGetPreset:
    def test_returns_correct_preset(self, client: TestClient):
        created = client.post("/api/presets", json=preset_payload(name="Unique")).json()
        resp = client.get(f"/api/presets/{created['id']}")
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]
        assert resp.json()["name"] == "Unique"

    def test_returns_404_for_unknown_id(self, client: TestClient):
        resp = client.get("/api/presets/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404


class TestCreatePreset:
    def test_creates_user_preset(self, client: TestClient):
        resp = client.post("/api/presets", json=preset_payload())
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert data["is_default"] is False
        assert data["user_id"] == "anonymous"

    def test_rejects_invalid_type(self, client: TestClient):
        resp = client.post("/api/presets", json=preset_payload(type="invalid"))
        assert resp.status_code == 422

    def test_rejects_invalid_category(self, client: TestClient):
        resp = client.post("/api/presets", json=preset_payload(category="asteroid"))
        assert resp.status_code == 422

    def test_stores_parameters_correctly(self, client: TestClient):
        params = {"rootFrequency": 880, "waveform": "sawtooth"}
        resp = client.post("/api/presets", json=preset_payload(parameters=params))
        assert resp.status_code == 200
        assert resp.json()["parameters"]["rootFrequency"] == 880


class TestUpdatePreset:
    def test_patches_user_preset(self, client: TestClient):
        preset_id = client.post("/api/presets", json=preset_payload(name="Old")).json()["id"]
        resp = client.patch(f"/api/presets/{preset_id}", json={"name": "New"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "New"

    def test_cannot_update_default_preset(self, client: TestClient):
        defaults = client.get("/api/presets/defaults").json()
        default_id = defaults[0]["id"]
        resp = client.patch(f"/api/presets/{default_id}", json={"name": "Hacked"})
        assert resp.status_code == 403

    def test_returns_404_for_unknown_id(self, client: TestClient):
        resp = client.patch(
            "/api/presets/00000000-0000-0000-0000-000000000000",
            json={"name": "Ghost"},
        )
        assert resp.status_code == 404


class TestDeletePreset:
    def test_deletes_user_preset(self, client: TestClient):
        preset_id = client.post("/api/presets", json=preset_payload()).json()["id"]
        resp = client.delete(f"/api/presets/{preset_id}")
        assert resp.status_code == 200
        assert resp.json() == {"status": "deleted"}

    def test_cannot_delete_default_preset(self, client: TestClient):
        defaults = client.get("/api/presets/defaults").json()
        default_id = defaults[0]["id"]
        resp = client.delete(f"/api/presets/{default_id}")
        assert resp.status_code == 403

    def test_deleted_preset_gone_from_list(self, client: TestClient):
        preset_id = client.post("/api/presets", json=preset_payload()).json()["id"]
        client.delete(f"/api/presets/{preset_id}")
        ids = [p["id"] for p in client.get("/api/presets").json()]
        assert preset_id not in ids

    def test_returns_404_for_unknown_id(self, client: TestClient):
        resp = client.delete("/api/presets/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404
