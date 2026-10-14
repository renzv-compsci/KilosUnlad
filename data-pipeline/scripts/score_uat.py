"""
score_uat.py
Scores the User Acceptance sessions recorded in docs/testing/uat/uat_responses.csv
(one row per participant, filled from UAT_RATING_FORM.md).

- System Usability Scale (Brooke, 1996): odd items contribute (answer - 1), even items
  (5 - answer); the sum is multiplied by 2.5 for a 0-100 score.
- Per scenario A-D: completion rate among participants who attempted it (Y or N;
  'n/a' or blank = not attempted) and the mean ease rating (1-5).
- Verdict: PASS when the mean SUS is >= 68 and every attempted scenario has a
  completion rate >= 80 %. With no responses it reports NO DATA, never a score.

Usage: python data-pipeline/scripts/score_uat.py docs/testing/uat/uat_responses.csv [--markdown]
"""
import csv
import sys

SUS_PASS = 68.0
COMPLETION_PASS = 0.80
SCENARIOS = ['a', 'b', 'c', 'd']


def sus_score(answers):
    if len(answers) != 10 or any(a not in (1, 2, 3, 4, 5) for a in answers):
        raise ValueError('SUS needs 10 answers, each 1 to 5')
    total = sum((a - 1) if i % 2 == 0 else (5 - a) for i, a in enumerate(answers))
    return total * 2.5


def score(rows):
    participants = []
    for row in rows:
        answers = [int(row[f'sus_{i}']) for i in range(1, 11)]
        participants.append({'id': row['participant_id'], 'role': row['role'], 'sus': sus_score(answers),
                             'approve': (row.get('would_approve') or '').strip()})
    scenarios = {}
    for s in SCENARIOS:
        attempted = [r for r in rows if (r.get(f'{s}_completed') or '').strip().upper() in ('Y', 'N')]
        done = [r for r in attempted if r[f'{s}_completed'].strip().upper() == 'Y']
        eases = [int(r[f'{s}_ease']) for r in attempted if (r.get(f'{s}_ease') or '').strip().isdigit()]
        if any(e not in (1, 2, 3, 4, 5) for e in eases):
            raise ValueError(f'Scenario {s.upper()} ease ratings must be 1 to 5')
        scenarios[s] = {'attempted': len(attempted), 'completed': len(done),
                        'completion': (len(done) / len(attempted)) if attempted else None,
                        'mean_ease': (sum(eases) / len(eases)) if eases else None}
    if not participants:
        return {'participants': [], 'scenarios': scenarios, 'mean_sus': None, 'verdict': 'NO DATA'}
    mean_sus = sum(p['sus'] for p in participants) / len(participants)
    passed = mean_sus >= SUS_PASS and all(v['completion'] is None or v['completion'] >= COMPLETION_PASS for v in scenarios.values())
    return {'participants': participants, 'scenarios': scenarios, 'mean_sus': mean_sus, 'verdict': 'PASS' if passed else 'NOT YET'}


def report(result):
    lines = ['| Participant | Role | SUS | Would approve |', '| --- | --- | ---: | --- |']
    lines += [f"| {p['id']} | {p['role']} | {p['sus']:.1f} | {p['approve'] or '-'} |" for p in result['participants']]
    lines += ['', '| Scenario | Attempted | Completed | Completion | Mean ease (1-5) |', '| --- | ---: | ---: | ---: | ---: |']
    for s, v in result['scenarios'].items():
        completion = f"{v['completion'] * 100:.0f} %" if v['completion'] is not None else '-'
        ease = f"{v['mean_ease']:.1f}" if v['mean_ease'] is not None else '-'
        lines.append(f"| {s.upper()} | {v['attempted']} | {v['completed']} | {completion} | {ease} |")
    mean = f"{result['mean_sus']:.1f}" if result['mean_sus'] is not None else '-'
    lines += ['', f"**Mean SUS:** {mean} (pass mark {SUS_PASS:.0f}). **Verdict:** {result['verdict']}"]
    return '\n'.join(lines)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    with open(sys.argv[1], newline='', encoding='utf-8') as handle:
        rows = [r for r in csv.DictReader(handle) if (r.get('participant_id') or '').strip()]
    print(report(score(rows)))
