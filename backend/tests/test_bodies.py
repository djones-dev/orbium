"""
Bodies API integration tests.

Covers CRUD operations and the attributes sub-resource, establishing a
behavioral contract that must hold after the ECS migration.
"""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import body_payload


class TestCreateBody:
    def test_creates_body_and_returns_201_data(self, client: TestClient):
        resp = client.post("/api/bodies", json=body_payload())
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert data["type"] == "planet"
        assert data["position"] == {"radius": 5.0, "angle": 1.0}
        assert data["velocity"] == 0.2
        assert data["user_id"] == "anonymous"
        assert "created_at" in data

    def test_accepts_all_body_types(self, client: TestClient):
        for body_type in ("sun", "planet", "moon"):
            resp = client.post("/api/bodies", json=body_payload(type=body_type))
            assert resp.status_code == 200, f"failed for type={body_type}"
            assert resp.json()["type"] == body_type

    def test_accepts_optional_preset_id(self, client: TestClient):
        payload = body_payload(preset_id="some-preset-uuid")
        resp = client.post("/api/bodies", json=payload)
        assert resp.status_code == 200
        assert resp.json()["preset_id"] == "some-preset-uuid"

    def test_accepts_optional_parent_id(self, client: TestClient):
        payload = body_payload(parent_id="parent-body-uuid", type="moon")
        resp = client.post("/api/bodies", json=payload)
        assert resp.status_code == 200
        assert resp.json()["parent_id"] == "parent-body-uuid"

    def test_rejects_invalid_type(self, client: TestClient):
        payload = body_payload(type="asteroid")
        resp = client.post("/api/bodies", json=payload)
        assert resp.status_code == 422

    def test_rejects_missing_required_fields(self, client: TestClient):
        resp = client.post("/api/bodies", json={"type": "planet"})
        assert resp.status_code == 422


class TestListBodies:
    def test_returns_list(self, client: TestClient):
        client.post("/api/bodies", json=body_payload())
        resp = client.get("/api/bodies")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 1

    def test_each_item_has_required_fields(self, client: TestClient):
        client.post("/api/bodies", json=body_payload())
        items = client.get("/api/bodies").json()
        for item in items:
            for field in ("id", "type", "position", "velocity", "audio_params", "user_id"):
                assert field in item, f"missing field: {field}"


class TestUpdateBody:
    def test_patches_audio_params(self, client: TestClient):
        body_id = client.post("/api/bodies", json=body_payload()).json()["id"]
        patch = {"audio_params": {"rootFrequency": 440, "gainLevel": -6}}
        resp = client.patch(f"/api/bodies/{body_id}", json=patch)
        assert resp.status_code == 200
        assert resp.json()["audio_params"]["rootFrequency"] == 440

    def test_patches_position(self, client: TestClient):
        body_id = client.post("/api/bodies", json=body_payload()).json()["id"]
        patch = {"position": {"radius": 10.0, "angle": 3.14}}
        resp = client.patch(f"/api/bodies/{body_id}", json=patch)
        assert resp.status_code == 200
        assert resp.json()["position"]["radius"] == 10.0

    def test_patches_velocity(self, client: TestClient):
        body_id = client.post("/api/bodies", json=body_payload()).json()["id"]
        resp = client.patch(f"/api/bodies/{body_id}", json={"velocity": 0.5})
        assert resp.status_code == 200
        assert resp.json()["velocity"] == 0.5

    def test_returns_404_for_unknown_id(self, client: TestClient):
        resp = client.patch("/api/bodies/00000000-0000-0000-0000-000000000000", json={"velocity": 1.0})
        assert resp.status_code == 404


class TestDeleteBody:
    def test_deletes_body(self, client: TestClient):
        body_id = client.post("/api/bodies", json=body_payload()).json()["id"]
        resp = client.delete(f"/api/bodies/{body_id}")
        assert resp.status_code == 200
        assert resp.json() == {"status": "deleted"}

    def test_deleted_body_no_longer_in_list(self, client: TestClient):
        body_id = client.post("/api/bodies", json=body_payload()).json()["id"]
        client.delete(f"/api/bodies/{body_id}")
        ids = [b["id"] for b in client.get("/api/bodies").json()]
        assert body_id not in ids

    def test_returns_404_for_unknown_id(self, client: TestClient):
        resp = client.delete("/api/bodies/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404


class TestBodyAttributes:
    def test_adds_attribute_to_body(self, client: TestClient):
        body_id = client.post("/api/bodies", json=body_payload()).json()["id"]
        attr = {"preset_id": "attr-preset-uuid", "name": "reverb"}
        resp = client.post(f"/api/bodies/{body_id}/attributes", json=attr)
        assert resp.status_code == 200
        assert any(
            a.get("preset_id") == "attr-preset-uuid"
            for a in resp.json()["attributes"]
        )

    def test_returns_404_for_unknown_body(self, client: TestClient):
        resp = client.post(
            "/api/bodies/00000000-0000-0000-0000-000000000000/attributes",
            json={"preset_id": "x"},
        )
        assert resp.status_code == 404


class TestHealthCheck:
    def test_health_endpoint_returns_ok(self, client: TestClient):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("ok", "degraded")
        assert data["service"] == "orbium-backend"
