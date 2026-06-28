import unittest

from parsers import parse_sleep_sessions
import scores as s


def _sleep_point(
    start: str,
    end: str,
    minutes_asleep: int,
    *,
    nap: bool = False,
    platform: str | None = None,
) -> dict:
    point: dict = {
        "sleep": {
            "interval": {"startTime": start, "endTime": end},
            "stages": [
                {
                    "type": "LIGHT",
                    "startTime": start,
                    "endTime": end,
                }
            ],
            "summary": {"minutesAsleep": minutes_asleep},
            "metadata": {"nap": True} if nap else {},
        }
    }
    if platform:
        point["dataSource"] = {"platform": platform}
    return point


class ParseSleepSessionsTests(unittest.TestCase):
    def test_sums_real_naps_flagged_by_api(self):
        day = "2026-06-27"
        points = [
            _sleep_point(
                "2026-06-26T23:00:00Z",
                "2026-06-27T06:00:00Z",
                420,
                platform="HEALTH_CONNECT",
            ),
            _sleep_point(
                "2026-06-27T14:00:00Z",
                "2026-06-27T16:00:00Z",
                120,
                nap=True,
                platform="HEALTH_CONNECT",
            ),
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
        points = [
            _sleep_point(
                "2026-06-26T23:00:00Z",
                "2026-06-27T07:30:00Z",
                450,
                platform="HEALTH_CONNECT",
            )
        ]
        row = parse_sleep_sessions(points)[day]
        self.assertEqual(row["total_asleep_min"], row["asleep_min"])
        self.assertEqual(row["naps_min"], 0)
        self.assertEqual(row["nap_count"], 0)

    def test_prefers_health_connect_over_overlapping_nest(self):
        day = "2026-06-28"
        points = [
            _sleep_point(
                "2026-06-28T04:29:00Z",
                "2026-06-28T09:30:00Z",
                294,
                platform="FITBIT",
            ),
            _sleep_point(
                "2026-06-28T04:21:50.630Z",
                "2026-06-28T09:40:55.256Z",
                285,
                platform="HEALTH_CONNECT",
            ),
            _sleep_point(
                "2026-06-28T14:53:00Z",
                "2026-06-28T16:43:00Z",
                101,
                nap=True,
                platform="FITBIT",
            ),
            _sleep_point(
                "2026-06-28T14:50:44.982Z",
                "2026-06-28T15:39:47.124Z",
                41,
                nap=True,
                platform="HEALTH_CONNECT",
            ),
        ]
        row = parse_sleep_sessions(points)[day]
        self.assertAlmostEqual(row["asleep_min"], 285)
        self.assertAlmostEqual(row["naps_min"], 41)
        self.assertAlmostEqual(row["total_asleep_min"], 326)
        self.assertEqual(row["nap_count"], 1)
        self.assertEqual(row["session_count"], 2)

    def test_two_distinct_nights_same_day_both_counted(self):
        # Two genuine sleep blocks ending the same day, 3h apart (> merge gap),
        # non-overlapping, neither flagged nap: the second must not be dropped.
        day = "2026-06-28"
        points = [
            _sleep_point(
                "2026-06-27T23:00:00Z",
                "2026-06-28T03:00:00Z",
                240,
                platform="HEALTH_CONNECT",
            ),
            _sleep_point(
                "2026-06-28T06:00:00Z",
                "2026-06-28T09:00:00Z",
                180,
                platform="HEALTH_CONNECT",
            ),
        ]
        row = parse_sleep_sessions(points)[day]
        self.assertAlmostEqual(row["asleep_min"], 240)  # longest night = score base
        self.assertAlmostEqual(row["total_asleep_min"], 420)  # both nights summed
        self.assertEqual(row["naps_min"], 0)
        self.assertEqual(row["nap_count"], 0)
        self.assertEqual(row["session_count"], 2)

    def test_efficiency_capped_when_sleep_period_missing(self):
        # API reports more minutesAsleep than the stage/interval span and no
        # minutesInSleepPeriod: time-in-bed must clamp up, efficiency stay <= 100.
        day = "2026-06-28"
        points = [
            _sleep_point(
                "2026-06-27T23:00:00Z",  # 6h interval = 360 min span
                "2026-06-28T05:00:00Z",
                400,  # reported asleep exceeds the span
                platform="HEALTH_CONNECT",
            )
        ]
        row = parse_sleep_sessions(points)[day]
        self.assertLessEqual(row["efficiency"], 100)
        self.assertGreaterEqual(row["total_min"], row["asleep_min"])
        self.assertAlmostEqual(row["total_min"], 400)


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
