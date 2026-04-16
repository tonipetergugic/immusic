from __future__ import annotations

from collections import defaultdict

import numpy as np

from schemas import (
    Bar,
    Region,
    RegionSimilarityMetrics,
    RepeatedRegionGroup,
    Section,
    SimilarRegionPair,
    UniquenessEntry,
)


SIMILARITY_THRESHOLD = 0.82
MIN_BARS_PER_REGION = 2


def compute_region_similarity(
    bars: list[Bar],
    sections: list[Section],
    bar_feature_vectors: list[list[float]],
) -> RegionSimilarityMetrics:
    if not _has_valid_inputs(bars, sections, bar_feature_vectors):
        return _empty_region_similarity()

    regions = _build_regions(sections=sections, bars=bars)
    if not regions:
        return _empty_region_similarity()

    region_vectors = _build_region_vectors(
        regions=regions,
        bar_feature_vectors=bar_feature_vectors,
    )
    if not region_vectors:
        return _empty_region_similarity()

    similar_region_pairs = _build_similar_region_pairs(region_vectors=region_vectors)
    repeated_region_groups = _build_repeated_region_groups(
        regions=regions,
        similar_region_pairs=similar_region_pairs,
    )
    uniqueness_profile = _build_uniqueness_profile(
        regions=regions,
        similar_region_pairs=similar_region_pairs,
    )

    mean_pair_similarity = (
        float(np.mean([pair.similarity_score for pair in similar_region_pairs]))
        if similar_region_pairs
        else 0.0
    )
    strongest_group_similarity = (
        max((group.group_similarity_score for group in repeated_region_groups), default=0.0)
    )
    repeated_region_coverage_ratio = _compute_repeated_region_coverage_ratio(
        regions=regions,
        repeated_region_groups=repeated_region_groups,
    )

    global_score = (
        0.5 * mean_pair_similarity
        + 0.3 * repeated_region_coverage_ratio
        + 0.2 * strongest_group_similarity
    )
    global_score = float(np.clip(global_score, 0.0, 1.0))
    similarity_label = _similarity_label_from_score(global_score)

    return RegionSimilarityMetrics(
        global_score=global_score,
        similarity_label=similarity_label,
        similar_region_pairs=similar_region_pairs,
        repeated_region_groups=repeated_region_groups,
        uniqueness_profile=uniqueness_profile,
    )


def _empty_region_similarity() -> RegionSimilarityMetrics:
    return RegionSimilarityMetrics(
        global_score=0.0,
        similarity_label="very_diverse",
        similar_region_pairs=[],
        repeated_region_groups=[],
        uniqueness_profile=[],
    )


def _has_valid_inputs(
    bars: list[Bar],
    sections: list[Section],
    bar_feature_vectors: list[list[float]],
) -> bool:
    if not bars or not sections or not bar_feature_vectors:
        return False
    if len(bars) != len(bar_feature_vectors):
        return False
    return True


def _build_regions(
    sections: list[Section],
    bars: list[Bar],
) -> list[Region]:
    regions: list[Region] = []

    for section in sections:
        start_bar = int(section.start_bar_index)
        end_bar = int(section.end_bar_index)

        if start_bar < 0 or end_bar >= len(bars):
            continue
        if end_bar < start_bar:
            continue

        length_bars = (end_bar - start_bar) + 1
        if length_bars < MIN_BARS_PER_REGION:
            continue

        region_id = f"region_{section.index}"
        start_time_sec = float(bars[start_bar].start)
        end_time_sec = float(bars[end_bar].end)
        length_sec = float(end_time_sec - start_time_sec)

        regions.append(
            Region(
                region_id=region_id,
                start_bar=start_bar,
                end_bar=end_bar,
                start_time_sec=start_time_sec,
                end_time_sec=end_time_sec,
                length_bars=length_bars,
                length_sec=length_sec,
            )
        )

    return regions


def _build_region_vectors(
    regions: list[Region],
    bar_feature_vectors: list[list[float]],
) -> dict[str, np.ndarray]:
    region_vectors: dict[str, np.ndarray] = {}

    for region in regions:
        start_bar = region.start_bar
        end_bar = region.end_bar + 1

        region_matrix = np.asarray(bar_feature_vectors[start_bar:end_bar], dtype=np.float64)
        if region_matrix.size == 0:
            continue
        if region_matrix.ndim != 2:
            continue

        mean_vector = np.mean(region_matrix, axis=0)
        norm = float(np.linalg.norm(mean_vector))
        if norm <= 0.0:
            continue

        region_vectors[region.region_id] = mean_vector / norm

    return region_vectors


def _build_similar_region_pairs(
    region_vectors: dict[str, np.ndarray],
) -> list[SimilarRegionPair]:
    region_ids = list(region_vectors.keys())
    pairs: list[SimilarRegionPair] = []

    for i in range(len(region_ids)):
        for j in range(i + 1, len(region_ids)):
            region_a_id = region_ids[i]
            region_b_id = region_ids[j]

            similarity = float(
                np.dot(region_vectors[region_a_id], region_vectors[region_b_id])
            )
            similarity = float(np.clip(similarity, 0.0, 1.0))

            if similarity < SIMILARITY_THRESHOLD:
                continue

            pairs.append(
                SimilarRegionPair(
                    region_a_id=region_a_id,
                    region_b_id=region_b_id,
                    similarity_score=similarity,
                )
            )

    pairs.sort(key=lambda pair: pair.similarity_score, reverse=True)
    return pairs


def _build_repeated_region_groups(
    regions: list[Region],
    similar_region_pairs: list[SimilarRegionPair],
) -> list[RepeatedRegionGroup]:
    if not similar_region_pairs:
        return []

    adjacency: dict[str, set[str]] = defaultdict(set)
    for pair in similar_region_pairs:
        adjacency[pair.region_a_id].add(pair.region_b_id)
        adjacency[pair.region_b_id].add(pair.region_a_id)

    region_ids = {region.region_id for region in regions}
    visited: set[str] = set()
    groups: list[RepeatedRegionGroup] = []

    for region_id in region_ids:
        if region_id in visited or region_id not in adjacency:
            continue

        stack = [region_id]
        component: list[str] = []

        while stack:
            current = stack.pop()
            if current in visited:
                continue

            visited.add(current)
            component.append(current)

            for neighbor in adjacency[current]:
                if neighbor not in visited:
                    stack.append(neighbor)

        if len(component) < 2:
            continue

        component = sorted(component)
        group_similarity_score = _mean_similarity_for_component(
            component=component,
            similar_region_pairs=similar_region_pairs,
        )

        groups.append(
            RepeatedRegionGroup(
                group_id=f"group_{len(groups) + 1}",
                region_ids=component,
                group_similarity_score=group_similarity_score,
            )
        )

    groups.sort(key=lambda group: group.group_similarity_score, reverse=True)
    return groups


def _mean_similarity_for_component(
    component: list[str],
    similar_region_pairs: list[SimilarRegionPair],
) -> float:
    component_set = set(component)
    scores: list[float] = []

    for pair in similar_region_pairs:
        if (
            pair.region_a_id in component_set
            and pair.region_b_id in component_set
        ):
            scores.append(float(pair.similarity_score))

    if not scores:
        return 0.0

    return float(np.mean(scores))


def _build_uniqueness_profile(
    regions: list[Region],
    similar_region_pairs: list[SimilarRegionPair],
) -> list[UniquenessEntry]:
    max_similarity_by_region: dict[str, float] = {
        region.region_id: 0.0 for region in regions
    }

    for pair in similar_region_pairs:
        max_similarity_by_region[pair.region_a_id] = max(
            max_similarity_by_region[pair.region_a_id],
            float(pair.similarity_score),
        )
        max_similarity_by_region[pair.region_b_id] = max(
            max_similarity_by_region[pair.region_b_id],
            float(pair.similarity_score),
        )

    uniqueness_entries: list[UniquenessEntry] = []
    for region in regions:
        max_similarity = max_similarity_by_region.get(region.region_id, 0.0)
        uniqueness_score = float(np.clip(1.0 - max_similarity, 0.0, 1.0))

        uniqueness_entries.append(
            UniquenessEntry(
                region_id=region.region_id,
                uniqueness_score=uniqueness_score,
            )
        )

    return uniqueness_entries


def _compute_repeated_region_coverage_ratio(
    regions: list[Region],
    repeated_region_groups: list[RepeatedRegionGroup],
) -> float:
    if not regions:
        return 0.0
    if not repeated_region_groups:
        return 0.0

    repeated_region_ids: set[str] = set()
    for group in repeated_region_groups:
        repeated_region_ids.update(group.region_ids)

    return float(
        np.clip(len(repeated_region_ids) / len(regions), 0.0, 1.0)
    )


def _similarity_label_from_score(global_score: float) -> str:
    score = float(np.clip(global_score, 0.0, 1.0))

    if score < 0.20:
        return "very_diverse"
    if score < 0.40:
        return "diverse"
    if score < 0.60:
        return "balanced"
    if score < 0.80:
        return "similar"
    return "highly_repetitive"
