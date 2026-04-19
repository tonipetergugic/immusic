from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


def _die(message: str, code: int = 1) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(code)


def _safe_float(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _load_json(json_path: Path) -> dict[str, Any]:
    return json.loads(json_path.read_text(encoding="utf-8"))


def _is_boundary_candidate(data: dict[str, Any], target_bar: int) -> bool:
    novelty = data.get("novelty")
    if not isinstance(novelty, dict):
        return False
    candidates = novelty.get("boundary_candidates")
    if not isinstance(candidates, list):
        return False
    for item in candidates:
        if not isinstance(item, dict):
            continue
        idx = _safe_int(item.get("bar_index"))
        if idx is not None and idx == target_bar:
            return True
    return False


def _l2_delta_from_prev(bar_feature_vectors: list[Any], c: int) -> float | None:
    if c <= 0 or c >= len(bar_feature_vectors):
        return None
    prev_vec = bar_feature_vectors[c - 1]
    curr_vec = bar_feature_vectors[c]
    if not isinstance(prev_vec, list) or not isinstance(curr_vec, list):
        return None
    if len(prev_vec) != len(curr_vec):
        return None
    total = 0.0
    for a, b in zip(prev_vec, curr_vec):
        fa = _safe_float(a)
        fb = _safe_float(b)
        if fa is None or fb is None:
            return None
        d = fb - fa
        total += d * d
    return total**0.5


def _matrix_get(matrix: list[Any], i: int, j: int) -> float | None:
    if i < 0 or j < 0:
        return None
    if i >= len(matrix):
        return None
    row = matrix[i]
    if not isinstance(row, list) or j >= len(row):
        return None
    return _safe_float(row[j])


def _raw_metrics_for_position(
    *,
    bar_count: int,
    novelty_curve: list[Any],
    bar_feature_vectors: list[Any],
    matrix: list[Any],
    c: int,
) -> dict[str, float | None]:
    novelty: float | None = None
    if 0 <= c < len(novelty_curve):
        novelty = _safe_float(novelty_curve[c])

    delta_from_prev = _l2_delta_from_prev(bar_feature_vectors, c)

    similarity_prev_to_here: float | None = None
    if c > 0:
        similarity_prev_to_here = _matrix_get(matrix, c - 1, c)

    similarity_here_to_next: float | None = None
    if c + 1 < bar_count:
        similarity_here_to_next = _matrix_get(matrix, c, c + 1)

    next_similarity: float | None = None
    if c + 2 < bar_count:
        next_similarity = _matrix_get(matrix, c + 1, c + 2)

    next_next_similarity: float | None = None
    if c + 3 < bar_count:
        next_next_similarity = _matrix_get(matrix, c + 2, c + 3)

    return {
        "novelty": novelty,
        "delta_from_prev": delta_from_prev,
        "similarity_prev_to_here": similarity_prev_to_here,
        "similarity_here_to_next": similarity_here_to_next,
        "next_similarity": next_similarity,
        "next_next_similarity": next_next_similarity,
    }


def _normalize_local(values: list[float | None]) -> list[float]:
    """Min-max to 0..1 over non-None entries; all-equal or empty present -> 0.5; None -> 0.5."""
    present = [v for v in values if v is not None]
    n = len(values)
    if not present:
        return [0.5] * n
    mn = min(present)
    mx = max(present)
    if mx == mn:
        return [0.5] * n
    out: list[float] = []
    for v in values:
        if v is None:
            out.append(0.5)
        else:
            out.append((v - mn) / (mx - mn))
    return out


def _inverse_prev_raw(sim: float | None) -> float | None:
    if sim is None:
        return None
    return 1.0 - sim


def _arrival_score_components(
    sim_here: float | None,
    next_sim: float | None,
    next_next: float | None,
    sim_here_n: float,
    next_n: float,
    nn_n: float,
) -> float:
    parts: list[tuple[float, float]] = []
    if sim_here is not None:
        parts.append((0.45, sim_here_n))
    if next_sim is not None:
        parts.append((0.30, next_n))
    if next_next is not None:
        parts.append((0.25, nn_n))
    if not parts:
        return 0.5
    w_sum = sum(w for w, _ in parts)
    return sum(w * val for w, val in parts) / w_sum


def _select_winner(
    positions: list[int],
    final_scores: dict[int, float],
) -> int:
    """Highest final_score; tie: scores within 0.03 of max -> prefer earlier bar."""
    if not positions:
        _die("Internal error: no positions to score.", 2)
    best_score = max(final_scores[p] for p in positions)
    tied = [p for p in positions if (best_score - final_scores[p]) < 0.03]
    return min(tied)


def main() -> int:
    if len(sys.argv) != 3:
        _die(
            'Usage: python analysis_engine/debug_rescore_candidates.py "<path-to-analysis.json>" <target_bar>',
            1,
        )

    json_path = Path(sys.argv[1]).expanduser()
    if not json_path.is_file():
        _die(f"JSON not found or not a file: {json_path}", 1)

    target_bar = _safe_int(sys.argv[2])
    if target_bar is None:
        _die("target_bar must be an integer.", 1)

    data = _load_json(json_path)

    if not _is_boundary_candidate(data, target_bar):
        _die(
            f"target_bar={target_bar} is not a boundary candidate "
            f"(not found in novelty.boundary_candidates).",
            1,
        )

    structure = data.get("structure")
    novelty = data.get("novelty")
    features = data.get("features")
    similarity = data.get("similarity")

    if not isinstance(structure, dict):
        _die("Missing or invalid field: structure (object expected).", 1)
    if not isinstance(novelty, dict):
        _die("Missing or invalid field: novelty (object expected).", 1)
    if not isinstance(features, dict):
        _die("Missing or invalid field: features (object expected).", 1)
    if not isinstance(similarity, dict):
        _die("Missing or invalid field: similarity (object expected).", 1)

    bars = structure.get("bars")
    novelty_curve = novelty.get("novelty_curve")
    bar_feature_vectors = features.get("bar_feature_vectors")
    matrix = similarity.get("matrix")

    if not isinstance(bars, list) or not bars:
        _die("Missing or empty field: structure.bars", 1)
    if not isinstance(novelty_curve, list):
        _die("Missing or invalid field: novelty.novelty_curve (array expected).", 1)
    if not isinstance(bar_feature_vectors, list):
        _die("Missing or invalid field: features.bar_feature_vectors (array expected).", 1)
    if not isinstance(matrix, list):
        _die("Missing or invalid field: similarity.matrix (array expected).", 1)

    bar_count = len(bars)

    candidate_positions = [target_bar + k for k in range(4)]
    positions = [c for c in candidate_positions if 0 <= c < bar_count]
    if target_bar not in positions:
        _die("target_bar is out of range for structure.bars.", 1)

    print("=" * 72)
    print("CANDIDATE RESCORE DEBUG (local window only)")
    print("=" * 72)
    print(f"JSON: {json_path}")
    print(f"target_bar (base): {target_bar}")
    print(f"comparison positions: {positions}")
    print()

    raws: dict[int, dict[str, float | None]] = {}
    for c in positions:
        raws[c] = _raw_metrics_for_position(
            bar_count=bar_count,
            novelty_curve=novelty_curve,
            bar_feature_vectors=bar_feature_vectors,
            matrix=matrix,
            c=c,
        )

    novelty_vals = [raws[c]["novelty"] for c in positions]
    delta_vals = [raws[c]["delta_from_prev"] for c in positions]
    prev_sim_vals = [raws[c]["similarity_prev_to_here"] for c in positions]
    inv_prev_raw = [_inverse_prev_raw(v) for v in prev_sim_vals]

    sim_here_vals = [raws[c]["similarity_here_to_next"] for c in positions]
    next_vals = [raws[c]["next_similarity"] for c in positions]
    next_next_vals = [raws[c]["next_next_similarity"] for c in positions]

    novelty_norm = _normalize_local(novelty_vals)
    delta_norm = _normalize_local(delta_vals)
    prev_break_norm = _normalize_local(inv_prev_raw)

    sim_here_norm = _normalize_local(sim_here_vals)
    next_norm = _normalize_local(next_vals)
    next_next_norm = _normalize_local(next_next_vals)

    per_bar: dict[int, dict[str, float]] = {}
    for i, c in enumerate(positions):
        arrival = _arrival_score_components(
            sim_here=raws[c]["similarity_here_to_next"],
            next_sim=raws[c]["next_similarity"],
            next_next=raws[c]["next_next_similarity"],
            sim_here_n=sim_here_norm[i],
            next_n=next_norm[i],
            nn_n=next_next_norm[i],
        )
        break_score = (
            0.35 * novelty_norm[i]
            + 0.35 * delta_norm[i]
            + 0.30 * prev_break_norm[i]
        )
        transition_penalty = 1.0 - arrival
        final_score = (
            0.45 * break_score
            + 0.40 * arrival
            - 0.15 * transition_penalty
        )
        per_bar[c] = {
            "break_score": break_score,
            "arrival_score": arrival,
            "transition_penalty": transition_penalty,
            "final_score": final_score,
        }

    print("RAW VALUES (per bar)")
    print("-" * 72)
    for c in positions:
        r = raws[c]
        print(f"  bar {c}:")
        for key in (
            "novelty",
            "delta_from_prev",
            "similarity_prev_to_here",
            "similarity_here_to_next",
            "next_similarity",
            "next_next_similarity",
        ):
            print(f"    {key}: {r[key]}")
    print()

    print("NORMALIZED (min-max within window; missing -> 0.5; all-equal -> 0.5)")
    print("-" * 72)
    for i, c in enumerate(positions):
        print(f"  bar {c}:")
        print(f"    novelty_norm:        {novelty_norm[i]:.6f}")
        print(f"    delta_norm:          {delta_norm[i]:.6f}")
        print(f"    prev_break_norm:     {prev_break_norm[i]:.6f}  (from 1 - similarity_prev_to_here)")
        print(f"    sim_here_next_norm:  {sim_here_norm[i]:.6f}")
        print(f"    next_sim_norm:       {next_norm[i]:.6f}")
        print(f"    next_next_sim_norm:  {next_next_norm[i]:.6f}")
    print()

    print("SCORES (per bar)")
    print("-" * 72)
    for c in positions:
        p = per_bar[c]
        print(f"  bar {c}:")
        print(f"    break_score:          {p['break_score']:.6f}")
        print(f"    arrival_score:      {p['arrival_score']:.6f}")
        print(f"    transition_penalty: {p['transition_penalty']:.6f}")
        print(f"    final_score:        {p['final_score']:.6f}")
    print()

    final_scores = {c: per_bar[c]["final_score"] for c in positions}
    winner = _select_winner(positions, final_scores)
    base_score = final_scores[target_bar]
    winner_score = final_scores[winner]
    score_margin = winner_score - base_score
    base_arrival = per_bar[target_bar]["arrival_score"]
    winner_arrival = per_bar[winner]["arrival_score"]

    replaces = (
        winner > target_bar
        and score_margin >= 0.08
        and winner_arrival >= base_arrival - 1e-12
    )

    print("DECISION SUMMARY")
    print("-" * 72)
    print(f"  base_candidate:        {target_bar}")
    print(f"  winner_candidate:      {winner}")
    print(f"  score_margin:          {score_margin:.6f}  (winner final - base final)")
    print(f"  winner_replaces_base:  {replaces}")
    print()
    print("  Rules applied:")
    print("    - Replace base only if winner is a later bar (+1..+3 in window)")
    print("    - Margin >= 0.08")
    print("    - winner arrival_score >= base arrival_score")
    print("    - Winner selection uses tie preference: within 0.03 of max score -> earlier bar")
    print("=" * 72)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
