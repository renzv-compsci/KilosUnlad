"""Unit tests for score_uat.py (run: python -m pytest -q data-pipeline/scripts/test_score_uat.py)."""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(__file__))
from score_uat import report, score, sus_score  # noqa: E402


def row(pid, sus, a='Y', a_ease='5', c='n/a', c_ease=''):
    r = {'participant_id': pid, 'role': 'Regional Director', 'would_approve': 'Yes', 'a_completed': a, 'a_ease': a_ease,
         'b_completed': 'n/a', 'b_ease': '', 'c_completed': c, 'c_ease': c_ease, 'd_completed': '', 'd_ease': ''}
    r.update({f'sus_{i + 1}': str(v) for i, v in enumerate(sus)})
    return r


def test_sus_known_values():
    assert sus_score([5, 1] * 5) == 100.0
    assert sus_score([1, 5] * 5) == 0.0
    assert sus_score([3] * 10) == 50.0
    assert sus_score([4, 2, 4, 2, 4, 2, 4, 2, 4, 2]) == 75.0


def test_sus_rejects_bad_answers():
    with pytest.raises(ValueError):
        sus_score([3] * 9)
    with pytest.raises(ValueError):
        sus_score([0] + [3] * 9)


def test_verdict_and_completion_rates():
    result = score([row('P1', [4, 2] * 5), row('P2', [5, 1] * 5, a='N', a_ease='2', c='Y', c_ease='4')])
    assert result['mean_sus'] == 87.5
    assert result['scenarios']['a'] == {'attempted': 2, 'completed': 1, 'completion': 0.5, 'mean_ease': 3.5}
    assert result['scenarios']['b']['attempted'] == 0 and result['scenarios']['b']['completion'] is None
    assert result['verdict'] == 'NOT YET', 'scenario A completion 50 % is below the 80 % pass mark'
    assert score([row('P1', [4, 2] * 5)])['verdict'] == 'PASS'
    assert score([row('P1', [3] * 10)])['verdict'] == 'NOT YET', 'SUS 50 is below 68'


def test_no_responses_never_invents_a_score():
    result = score([])
    assert result['verdict'] == 'NO DATA' and result['mean_sus'] is None
    assert 'NO DATA' in report(result)
