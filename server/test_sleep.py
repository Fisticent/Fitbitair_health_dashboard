import unittest

from parsers import parse_sleep_sessions
import scores as s


def _sleep_point(date: str, start: str, end: str, asleep_min: float) -> dict:
    return {
        "sleep": {
            "interval": {"startTime": start, "endTime": end},
            "stages": [
                {
                    "type": "LIGHT",
                    "startTime": start,
                    "endTime": end,
                }
            ],
        }
    }


class ParseSleepSessionsTests(unittest.TestCase):
    def test_sums_naps_into_total(self):
        day = "2026-06-27"
        points = [
            _sleep_point(day, "2026-06-26T23:00:00Z", "2026-06-27T06:00:00Z", 420),
            _sleep_point(day, "2026-06-27T14:00:00Z", "2026-06-27T16:00:00Z", 120),
        ]
        parsed = parse_sleep_sessions(points)
        row = parsed[day]
        self.assertAlmostEqual(row["asleep_min"], 420)
        self.assertAlmostEqual(row["total_asleep_min"], 540)
        self.assertAlmostEqual(row["naps_min"], 120)
        self.assertEqual(row["nap_count"], 1)
        self.assertEqual(row["session_count"], 2)

    def test_single_session_has_no_nap_fields(self):
        day = "2026-06-27"
        points = [_sleep_point(day, "2026-06-26T23:00:00Z", "2026-06-27T07:30:00Z", 450)]
        row = parse_sleep_sessions(points)[day]
        self.assertEqual(row["total_asleep_min"], row["asleep_min"])
        self.assertEqual(row["naps_min"], 0)
        self.assertEqual(row["nap_count"], 0)


class ComputeSleepScoreTests(unittest.TestCase):
    def test_hours_use_total_score_uses_main(self):
        sleep = {
            "2026-06-27": {
                "asleep_min": 420,
                "total_asleep_min": 540,
                "naps_min": 120,
                "nap_count": 1,
                "deep": 60,
                "rem": 90,
                "light": 250,
                "awake": 20,
                "total_min": 440,
                "efficiency": 95,
            }
        }
        row = s.compute_sleep_score("2026-06-27", sleep, need=8.0)
        self.assertEqual(row["hours"], 9.0)
        self.assertEqual(row["main_hours"], 7.0)
        self.assertEqual(row["naps_hours"], 2.0)
        self.assertEqual(row["debt_hours"], 0.0)


if __name__ == "__main__":
    unittest.main()
