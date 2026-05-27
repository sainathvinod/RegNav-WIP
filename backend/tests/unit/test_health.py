import httpx


async def test_health_returns_ok(client: httpx.AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "timestamp" in body


async def test_ready_returns_status_and_checks(client: httpx.AsyncClient) -> None:
    response = await client.get("/ready")
    assert response.status_code == 200
    body = response.json()
    # Status is "ready" if DB+Redis are reachable, "degraded" otherwise.
    # Tests don't expect either to be up; just check the contract.
    assert body["status"] in {"ready", "degraded"}
    assert "checks" in body
    assert "database" in body["checks"]
    assert "redis" in body["checks"]
