#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Validate Trivia question-bank files (format next-round.trivia/2).

Usage:
  python3 tools/validate-bank.py <file.json> [more-files...] [--floor]
      [--emit-dnd [path]]

  The first file is the target. Any further files are cross-checked
  against it (and each other) for id collisions and duplicate facts —
  when validating a contribution, pass content/bank.json as an extra
  file so the set is checked against the pool it would join. One
  exception: a question that appears with the same id AND identical
  content in two files is a banked provenance copy (contribution file
  vs pool), not a collision, and is ignored by the cross-file checks.

  --floor          compare the target against the launch floor
                   (30 per category, difficulty split 12/10/8) and warn
                   where it is short. Also implied when the target is
                   named bank.json. Shortfalls are warnings, never
                   failures: the pool is an open pool that grows past
                   the floor as reviewed contributions land.
  --emit-dnd       after a passing validation, regenerate the
                   do-not-duplicate list from the target file
                   (default: docs/question-bank/DO-NOT-DUPLICATE.md).

Checks (from docs/question-bank/BRIEF.md):
  - format == "next-round.trivia/2", license == "CC0-1.0", title present
  - bank keys exactly {format, title, attribution, license, questions}
  - every question: keys exactly {id, prompt, choices, correctChoice,
    explanation, category, difficulty}; id lowercase kebab-case starting
    with "<category>-" and unique across all files given; category one
    of the ten codes; difficulty an integer 1-3; exactly 4 distinct
    choices; correctChoice in 0-3; prompt <= 1000 chars (warned over
    ~200, the brief's guidance); explanation present, <= 2000 chars
  - answer-key balance per file and per category: warned if any
    position exceeds 40% within a group of >= 5 questions
  - near-duplicates: warned on identical normalised prompts across all
    files, and on high slug-token overlap within a category (a
    same-fact heuristic for the reviewer, not proof)

Exit 0 = pass (warnings allowed), 1 = failure, 2 = usage error.
Warnings are printed so a human reviewer can still judge them;
failures block merging.
"""
import json
import re
import sys
from collections import Counter, defaultdict
from itertools import combinations
from pathlib import Path

CATEGORIES = [
    "geography",
    "history",
    "science-nature",
    "technology",
    "arts-literature",
    "pop-culture",
    "sports-games",
    "food-drink",
    "language-words",
    "world-everyday",
]
STANDARD_ATTRIBUTION = (
    "Original agent-drafted questions for Next Round, released under "
    "CC0-1.0; no human attestation claimed."
)
QUESTION_FIELDS = {
    "id",
    "prompt",
    "choices",
    "correctChoice",
    "explanation",
    "category",
    "difficulty",
}
BANK_FIELDS = {"format", "title", "attribution", "license", "questions"}
ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
FLOOR_PER_CATEGORY = 30
FLOOR_DIFFICULTY = {1: 12, 2: 10, 3: 8}


def norm(s):
    return re.sub(r"[^a-z0-9 ]+", "", str(s).lower()).strip()


def slug_tokens(qid):
    parts = str(qid).split("-")
    # Drop the category prefix (which may itself contain a hyphen) by
    # matching the longest category code, then drop the trailing tag.
    for cat in sorted(CATEGORIES, key=len, reverse=True):
        if qid.startswith(cat + "-"):
            parts = qid[len(cat) + 1 :].split("-")
            break
    if len(parts) > 1:
        parts = parts[:-1]
    return set(parts)


def is_int(v):
    return isinstance(v, int) and not isinstance(v, bool)


def validate_file(path, bank, fails, warns):
    tag_file = Path(path).name
    if not isinstance(bank, dict):
        fails.append(f"{tag_file}: top level must be a JSON object")
        return []
    extra = set(bank) - BANK_FIELDS
    missing = BANK_FIELDS - set(bank)
    if extra:
        fails.append(f"{tag_file}: unexpected bank keys {sorted(extra)}")
    if missing:
        fails.append(f"{tag_file}: missing bank keys {sorted(missing)}")
    if bank.get("format") != "next-round.trivia/2":
        fails.append(
            f"{tag_file}: format is {bank.get('format')!r}, "
            "expected 'next-round.trivia/2'"
        )
    if bank.get("license") != "CC0-1.0":
        fails.append(f"{tag_file}: license is {bank.get('license')!r}, expected 'CC0-1.0'")
    if not str(bank.get("title") or "").strip():
        fails.append(f"{tag_file}: title is missing")
    if bank.get("attribution") != STANDARD_ATTRIBUTION:
        warns.append(
            f"{tag_file}: attribution differs from the standard line "
            "(see BRIEF.md rights note)"
        )
    qs = bank.get("questions")
    if not isinstance(qs, list) or not qs:
        fails.append(f"{tag_file}: 'questions' must be a non-empty list")
        return []
    return qs


def validate_questions(path, qs, fails, warns):
    tag_file = Path(path).name
    key_balance_file = Counter()
    key_balance_cat = defaultdict(Counter)
    counts = defaultdict(Counter)  # category -> difficulty -> n
    for i, q in enumerate(qs):
        tag = f"{tag_file} question[{i}] id={q.get('id')!r}"
        if not isinstance(q, dict):
            fails.append(f"{tag}: question must be an object")
            continue
        fields = set(q)
        if fields != QUESTION_FIELDS:
            fails.append(
                f"{tag}: fields must be exactly {sorted(QUESTION_FIELDS)}, "
                f"got {sorted(fields)}"
            )
            continue
        cat, diff = q.get("category"), q.get("difficulty")
        if cat not in CATEGORIES:
            fails.append(f"{tag}: category {cat!r} is not one of the ten codes")
            cat = None
        if not is_int(diff) or not 1 <= diff <= 3:
            fails.append(f"{tag}: difficulty {diff!r} out of 1-3")
            diff = None
        qid = str(q.get("id", ""))
        if not ID_RE.match(qid):
            fails.append(f"{tag}: id must be lowercase kebab-case")
        elif cat is not None and not qid.startswith(cat + "-"):
            fails.append(f"{tag}: id must start with '{cat}-'")
        choices = q.get("choices")
        if (
            not isinstance(choices, list)
            or len(choices) != 4
            or len(set(map(str, choices))) != 4
        ):
            fails.append(f"{tag}: need exactly 4 distinct choices")
        elif any(not isinstance(c, str) or not 1 <= len(c) <= 300 for c in choices):
            fails.append(f"{tag}: every choice must be a string of 1-300 chars")
        cc = q.get("correctChoice")
        if not is_int(cc) or not 0 <= cc <= 3:
            fails.append(f"{tag}: correctChoice {cc!r} out of 0-3")
        else:
            key_balance_file[cc] += 1
            if cat is not None:
                key_balance_cat[cat][cc] += 1
        prompt = q.get("prompt")
        if not isinstance(prompt, str) or not 1 <= len(prompt) <= 1000:
            fails.append(f"{tag}: prompt must be a string of 1-1000 chars")
        elif len(prompt) > 200:
            warns.append(f"{tag}: prompt {len(prompt)} chars (>200, brief guidance)")
        expl = q.get("explanation")
        if not isinstance(expl, str) or not expl.strip():
            fails.append(f"{tag}: missing explanation")
        elif len(expl) > 2000:
            fails.append(f"{tag}: explanation {len(expl)} chars (>2000, schema limit)")
        if cat is not None and diff is not None:
            counts[cat][diff] += 1
    for label, balance in [("file", key_balance_file), *sorted(key_balance_cat.items())]:
        n = sum(balance.values())
        if n >= 5:
            for pos, c in sorted(balance.items()):
                if c / n > 0.40:
                    warns.append(
                        f"{tag_file} ({label}): answer position {pos} is {c}/{n} (>40%)"
                    )
    return counts


def check_floor(counts, warns):
    for cat in CATEGORIES:
        got = sum(counts.get(cat, {}).values())
        if got < FLOOR_PER_CATEGORY:
            warns.append(
                f"pool floor: category {cat} has {got}/{FLOOR_PER_CATEGORY} questions"
            )
        for diff, want in FLOOR_DIFFICULTY.items():
            have = counts.get(cat, {}).get(diff, 0)
            if have < want:
                warns.append(
                    f"pool floor: category {cat} difficulty {diff} has {have}/{want}"
                )


def emit_dnd(pool_path, qs, out_path):
    lines = [
        "<!-- SPDX-License-Identifier: Apache-2.0 -->",
        "",
        "# Trivia — Do Not Duplicate",
        "",
        "*Generated by `tools/validate-bank.py content/bank.json --emit-dnd`. "
        "Do not edit by hand; regenerate it whenever `content/bank.json` changes.*",
        "",
        "Every fact already in the pool is listed below, one line per "
        "question (id — prompt). A new contribution must not ask the same "
        "fact again, even reworded: if your question's fact appears here, "
        "pick a different fact. Same event, different fact (which king vs "
        "which year) is acceptable; same fact, new wording is not.",
        "",
        f"**{len(qs)} questions in the pool.**",
        "",
    ]
    for q in sorted(qs, key=lambda x: (str(x.get("category")), str(x.get("id")))):
        lines.append(f"- `{q.get('id')}` — {q.get('prompt')}")
    lines.append("")
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines))
    print(f"do-not-duplicate list written: {out} ({len(qs)} facts)")


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    floor = "--floor" in argv
    dnd_path = None
    if "--emit-dnd" in argv:
        i = argv.index("--emit-dnd")
        if i + 1 < len(argv) and not argv[i + 1].startswith("--"):
            dnd_path = argv[i + 1]
            args = [a for a in args if a != dnd_path]
        else:
            root = Path(__file__).resolve().parent.parent
            dnd_path = str(root / "docs" / "question-bank" / "DO-NOT-DUPLICATE.md")
    if not args:
        print(__doc__.strip().splitlines()[2])
        return 2

    fails, warns = [], []
    all_questions = []  # (source file, question)
    per_file_counts = {}
    for path in args:
        try:
            bank = json.load(open(path))
        except Exception as e:  # noqa: BLE001 - report any parse failure plainly
            print(f"FAIL: cannot parse {path}: {e}")
            return 1
        qs = validate_file(path, bank, fails, warns)
        if qs:
            per_file_counts[path] = validate_questions(path, qs, fails, warns)
            all_questions.extend((path, q) for q in qs)

    # Cross-file: id uniqueness and duplicate facts. A repeat id whose
    # content is identical is the banked provenance copy — skip it; a
    # repeat id with different content is a real collision.
    seen_ids = {}  # id -> (path, canonical json)
    seen_prompts = {}  # normalised prompt -> id
    for path, q in all_questions:
        qid = q.get("id")
        canon = json.dumps(q, sort_keys=True)
        if qid in seen_ids:
            first_path, first_canon = seen_ids[qid]
            if first_path == path:
                fails.append(f"duplicate id {qid!r} within {Path(path).name}")
            elif canon != first_canon:
                fails.append(
                    f"duplicate id {qid!r} with different content in "
                    f"{Path(path).name} and {Path(first_path).name}"
                )
            continue
        seen_ids[qid] = (path, canon)
        p = norm(q.get("prompt", ""))
        if p and p in seen_prompts:
            warns.append(
                f"near-duplicate prompt: {qid!r} ({Path(path).name}) matches "
                f"{seen_prompts[p]!r}"
            )
        seen_prompts.setdefault(p, qid)
    by_cat = defaultdict(list)
    seen_for_pairs = set()
    for _, q in all_questions:
        if q.get("category") in CATEGORIES and q.get("id") not in seen_for_pairs:
            seen_for_pairs.add(q.get("id"))
            by_cat[q["category"]].append(q)
    for cat, qs in by_cat.items():
        for a, b in combinations(qs, 2):
            if a.get("id") == b.get("id"):
                continue
            ta, tb = slug_tokens(a.get("id", "")), slug_tokens(b.get("id", ""))
            if not ta or not tb:
                continue
            jaccard = len(ta & tb) / len(ta | tb)
            if jaccard >= 0.5:
                warns.append(
                    f"possible same fact in {cat}: {a.get('id')!r} vs {b.get('id')!r} "
                    f"(slug overlap {jaccard:.2f}) — reviewer to judge"
                )

    target = args[0]
    counts = per_file_counts.get(target, {})
    total = sum(sum(d.values()) for d in counts.values())
    print(f"file: {target} — {total} questions")
    for cat in CATEGORIES:
        c = counts.get(cat, {})
        print(
            f"  {cat}: {sum(c.values())} "
            f"(d1 {c.get(1, 0)} / d2 {c.get(2, 0)} / d3 {c.get(3, 0)})"
        )
    if floor or Path(target).name == "bank.json":
        check_floor(counts, warns)

    for w in warns:
        print(f"WARN: {w}")
    for f in fails:
        print(f"FAIL: {f}")
    if fails:
        print(f"RESULT: FAIL ({len(fails)} failure(s), {len(warns)} warning(s))")
        return 1
    print(f"RESULT: PASS ({len(warns)} warning(s))")
    if dnd_path:
        pool_qs = [q for p, q in all_questions if p == target]
        emit_dnd(target, pool_qs, dnd_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
