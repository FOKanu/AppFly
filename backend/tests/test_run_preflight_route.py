from jobhunt.api.routes import runs as runs_routes


def test_preflight_route(api_client, monkeypatch):
    monkeypatch.setattr(
        runs_routes, "run_preflight", lambda c: {"ok": False, "problems": ["tunnel down"]}
    )
    r = api_client.get("/runs/preflight")
    assert r.status_code == 200
    assert r.json() == {"ok": False, "problems": ["tunnel down"]}


def test_start_run_503_when_data_dir_unwritable(api_client, monkeypatch):
    monkeypatch.setattr(
        runs_routes, "data_dir_problem", lambda: "AppFly data dir is not writable: /x"
    )
    r = api_client.post("/runs")
    assert r.status_code == 503
    assert "not writable" in r.json()["detail"]
