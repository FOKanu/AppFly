from jobhunt.api.routes import runs as runs_routes
from jobhunt.config import AppConfig


def test_preflight_route(api_client, monkeypatch):
    monkeypatch.setattr(
        runs_routes, "run_preflight", lambda c, root: {"ok": False, "problems": ["tunnel down"]}
    )
    r = api_client.get("/runs/preflight")
    assert r.status_code == 200
    assert r.json() == {"ok": False, "problems": ["tunnel down"]}


def test_start_run_503_when_data_dir_unwritable(api_client, monkeypatch):
    monkeypatch.setattr(
        runs_routes, "data_dir_problem", lambda root: "AppFly data dir is not writable: /x"
    )
    r = api_client.post("/runs")
    assert r.status_code == 503
    assert "not writable" in r.json()["detail"]


def _use_dir(monkeypatch, path) -> None:
    monkeypatch.setattr(runs_routes, "get_config", lambda request: AppConfig(native_data_dir=str(path)))


def test_start_run_503_for_unwritable_custom_dir(api_client, monkeypatch, tmp_path):
    blocker = tmp_path / "file"
    blocker.write_text("x")
    _use_dir(monkeypatch, blocker / "data")
    r = api_client.post("/runs")
    assert r.status_code == 503
    assert "not writable" in r.json()["detail"]


def test_preflight_reports_unwritable_custom_dir(api_client, monkeypatch, tmp_path):
    blocker = tmp_path / "file"
    blocker.write_text("x")
    _use_dir(monkeypatch, blocker / "data")
    r = api_client.get("/runs/preflight")
    assert any("not writable" in p for p in r.json()["problems"])


def test_preflight_writable_custom_dir_ignores_default(api_client, monkeypatch, tmp_path):
    blocker = tmp_path / "file"
    blocker.write_text("x")
    monkeypatch.setenv("APPFLY_DATA_DIR", str(blocker / "default"))
    _use_dir(monkeypatch, tmp_path / "custom")
    r = api_client.get("/runs/preflight")
    assert not any("not writable" in p for p in r.json()["problems"])
