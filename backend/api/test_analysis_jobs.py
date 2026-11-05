from datetime import datetime, timedelta, timezone

from backend.api import ocr


class _AnalysisJobs:
    def __init__(self):
        self.records = {}

    def insert_one(self, record):
        self.records[record["id"]] = dict(record)

    def update_one(self, query, update):
        self.records[query["id"]].update(update["$set"])

    def find_one(self, query, projection):
        record = self.records.get(query["id"])
        if (
            record is None
            or record["userId"] != query["userId"]
            or record["expiresAt"] <= query["expiresAt"]["$gt"]
        ):
            return None
        return {key: value for key, value in record.items() if not projection.get(key)}


class _Database:
    def __init__(self):
        self.analysis_jobs = _AnalysisJobs()


def test_analysis_job_updates_are_shared_and_user_scoped(monkeypatch):
    database = _Database()
    monkeypatch.setattr(ocr, "get_database", lambda: database)
    monkeypatch.setattr(ocr, "_analysis_jobs", {})

    job = {
        "id": "AN-test",
        "userId": "official-1",
        "status": "running",
        "expiresAt": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    ocr._create_analysis_job(job)
    ocr._analysis_jobs.clear()
    ocr._update_analysis_job("AN-test", {"status": "completed", "result": {"id": "scan-1"}})

    assert ocr._find_analysis_job("AN-test", "official-1") == {
        "id": "AN-test",
        "status": "completed",
        "result": {"id": "scan-1"},
    }
    assert ocr._find_analysis_job("AN-test", "official-2") is None
