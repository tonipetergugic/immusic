# Micro Design

## Purpose
Micro is a local change layer inside the existing macro structure.

Its job is to reveal meaningful internal movement within macro sections without creating a second full section system.

## What Micro Is
Micro is a marker-based layer for local structural movement.

It should help surface:
- local development points
- small energy shifts
- texture or density changes
- internal movement inside otherwise stable macro sections

## What Micro Is Not
Micro must not:
- replace macro structure
- create a second full section architecture
- label parts as build, drop, break, or similar
- make absolute musical judgments
- become a complex anchor or grouping system

## Minimal Output Contract
The first micro output should stay minimal.

### micro_markers
Each marker contains:
- `bar_index`
- `time_sec`
- `strength`
- `macro_section_index`

### micro_activity_by_macro_section
Each macro-section summary contains:
- `macro_section_index`
- `marker_count`
- `mean_strength`
- `max_strength`

## Signals
Micro uses only these existing signals:
- `novelty_strength`
- `rms_strength`
- `fused_strength`

Signal roles:
- `novelty_strength` indicates local structural change
- `rms_strength` indicates energy or density movement
- `fused_strength` is the main combined signal

## Threshold Strategy
Micro uses a hybrid threshold strategy.

Primary relevance is determined relative to the current macro section.

A small global minimum floor is allowed as a protective safeguard so very flat sections do not create noisy marker spam.

This means:
- section-relative logic is the main decision basis
- a light absolute minimum floor is only a guardrail
- fixed global thresholds must not become the primary logic

## Detection Scope
Micro searches only inside macro sections.

Macro boundaries themselves must not be counted again as micro markers.

A small exclusion zone around macro section edges should be used so micro does not simply mirror macro boundaries.

## Signal Roles
`fused_strength` is the primary signal for marker relevance.

`novelty_strength` is a gate signal that protects against false positive energy peaks without real structural meaning.

`rms_strength` remains useful, but only as an embedded helper signal inside fusion. It is not a separate primary threshold in the micro rules.

## Marker Rules
A bar should only become a micro marker when all of the following are true:
- it lies inside the interior of a macro section
- `fused_strength` is a local peak against neighboring bars
- `novelty_strength` is above a small minimum floor
- markers are not stacked too densely and must respect a minimum bar distance

## Detection Order
Micro should run in this order:
1. determine the interior of each macro section
2. compute section-relative context on `fused_strength`
3. detect local peaks
4. apply relevance filtering using section-relative strength, a small global floor, and novelty gating
5. suppress overly dense nearby peaks
6. build `micro_markers` and `micro_activity_by_macro_section`

Note:
The exact spacing parameter for nearby-peak suppression is intentionally not fixed yet and must be calibrated later.

## Guiding Principle
Macro describes the coarse form.

Micro describes the internal movement within that form.

Micro should remain small, useful, and easy to reason about.

## Current Scope

Der Micro-Block dient ausschließlich dazu, innerhalb bereits bestehender Macro-Sections interne Verdachtsmarker zu erkennen.

Aktueller Zweck:
- interne lokale Veränderungsspitzen innerhalb einer Macro-Section sichtbar machen
- keine neue Struktur erfinden
- keine Macro-Boundaries verschieben
- keine Anchor-Auswahl beeinflussen
- keine Transition-Bewertung vorwegnehmen

## Current Detection Logic

Aktuell arbeitet Micro mit folgenden Regeln:
- Grundlage ist die bar-basierte `fused_strength` aus dem Fusion-Layer
- Auswertung erfolgt section-relativ innerhalb der aktuellen Macro-Section
- die Schwelle ist adaptiv: lokaler Mean plus gewichtete lokale Standardabweichung
- zusätzlich gilt eine minimale globale Floor-Schwelle
- Bars an den Section-Rändern werden bewusst ausgeschlossen
- Marker müssen lokale Peaks sein
- Marker müssen einen minimalen Überschuss über der dynamischen Schwelle haben
- Marker müssen eine minimale Peak-Prominenz gegenüber direkten Nachbarbars haben

## Current Interpretation Rule

Micro-Marker sind keine harten musikalischen Wahrheiten.
Sie sind nur vorsichtige interne Hinweise auf mögliche lokale Strukturbewegung innerhalb einer bereits bestehenden Macro-Section.

Das bedeutet ausdrücklich:
- kein automatisches "hier beginnt sicher ein neuer Part"
- kein automatisches "hier ist sicher ein Break / Build / Drop"
- kein automatisches Umschreiben der bestehenden Struktur

## Explicit Non-Goals

Der aktuelle Micro-Block macht bewusst nicht:
- keine Micro-Sections erzeugen
- keine Macro-Sections splitten
- keine Boundary-Verschiebung
- keine Anchor-Neuwahl
- keine direkte Auswirkung auf Development-, Transition- oder Boundary-Entscheidungen

## Current Validation Status

Der aktuelle Stand ist vorläufig fachlich brauchbar.

Manuell als plausibel bestätigt:
- Crazy Love: Marker bei 00:45 plausibel
- Freaky 1: Marker bei 01:07 plausibel
- David Forbes - Techno Is My Only Drug: Marker bei 00:14 plausibel

Manuell als sinnvoll unauffällig:
- Entropy: keine Marker plausibel
- Beyond: keine Marker plausibel

Wichtig:
Der Block gilt damit als vorläufig stabilisiert, aber nicht als final ausgereizt.
Weitere Kalibrierung erfolgt nur bei klarer fachlicher Notwendigkeit, nicht blind.
