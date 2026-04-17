from __future__ import annotations

from math import sqrt


def _mean_vector(vectors: list[list[float]]) -> list[float]:
    if not vectors:
        return []

    dimension = len(vectors[0])
    if dimension == 0:
        return []

    sums = [0.0] * dimension
    count = 0

    for vector in vectors:
        if len(vector) != dimension:
            continue
        for idx, value in enumerate(vector):
            sums[idx] += float(value)
        count += 1

    if count == 0:
        return []

    return [value / count for value in sums]


def _euclidean_distance(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0

    return sqrt(sum((float(a) - float(b)) ** 2 for a, b in zip(left, right)))


def _mean_distance_to_centroid(
    vectors: list[list[float]],
    centroid: list[float],
) -> float:
    if not vectors or not centroid:
        return 0.0

    distances: list[float] = []

    for vector in vectors:
        if len(vector) != len(centroid):
            continue
        distances.append(_euclidean_distance(vector, centroid))

    if not distances:
        return 0.0

    return sum(distances) / len(distances)


def compute_state_change_strength(
    bar_feature_vectors: list[list[float]],
    center_index: int,
    before_window: int = 4,
    after_window: int = 2,
) -> float:
    if not bar_feature_vectors:
        return 0.0

    total = len(bar_feature_vectors)
    if center_index <= 0 or center_index >= total:
        return 0.0

    pre_start = max(0, center_index - before_window)
    pre_region = [
        vector
        for vector in bar_feature_vectors[pre_start:center_index]
        if isinstance(vector, list) and vector
    ]

    post_end = min(total, center_index + after_window)
    post_region = [
        vector
        for vector in bar_feature_vectors[center_index:post_end]
        if isinstance(vector, list) and vector
    ]

    if len(pre_region) < 2:
        return 0.0
    if len(post_region) < 1:
        return 0.0

    pre_centroid = _mean_vector(pre_region)
    post_centroid = _mean_vector(post_region)

    if not pre_centroid or not post_centroid:
        return 0.0

    raw_shift = _euclidean_distance(pre_centroid, post_centroid)
    if raw_shift <= 1e-9:
        return 0.0

    pre_spread = _mean_distance_to_centroid(pre_region, pre_centroid)
    post_spread = _mean_distance_to_centroid(post_region, post_centroid)

    denom = raw_shift + pre_spread + post_spread
    if denom <= 1e-9:
        return 0.0

    value = raw_shift / denom
    return max(0.0, min(1.0, float(value)))


def compute_persistence_after_change(
    bar_feature_vectors: list[list[float]],
    center_index: int,
    before_window: int = 4,
    anchor_window: int = 2,
    sustain_window: int = 4,
) -> float:
    if not bar_feature_vectors:
        return 0.0

    total = len(bar_feature_vectors)
    if center_index <= 0 or center_index >= total:
        return 0.0

    pre_start = max(0, center_index - before_window)
    pre_region = [
        vector
        for vector in bar_feature_vectors[pre_start:center_index]
        if isinstance(vector, list) and vector
    ]

    anchor_end = min(total, center_index + anchor_window)
    post_anchor_region = [
        vector
        for vector in bar_feature_vectors[center_index:anchor_end]
        if isinstance(vector, list) and vector
    ]

    sustain_end = min(total, anchor_end + sustain_window)
    sustain_region = [
        vector
        for vector in bar_feature_vectors[anchor_end:sustain_end]
        if isinstance(vector, list) and vector
    ]

    if len(pre_region) < 2:
        return 0.0
    if len(post_anchor_region) < 1:
        return 0.0
    if len(sustain_region) < 1:
        return 0.0

    pre_centroid = _mean_vector(pre_region)
    post_centroid = _mean_vector(post_anchor_region)

    if not pre_centroid or not post_centroid:
        return 0.0

    shift_strength = _euclidean_distance(pre_centroid, post_centroid)
    if shift_strength <= 1e-9:
        return 0.0

    scores: list[float] = []

    for vector in sustain_region:
        distance_to_pre = _euclidean_distance(vector, pre_centroid)
        distance_to_post = _euclidean_distance(vector, post_centroid)
        denom = distance_to_pre + distance_to_post

        if denom <= 1e-9:
            scores.append(0.0)
            continue

        closeness_to_new_state = distance_to_pre / denom
        scores.append(float(closeness_to_new_state))

    if not scores:
        return 0.0

    value = sum(scores) / len(scores)
    return max(0.0, min(1.0, float(value)))
