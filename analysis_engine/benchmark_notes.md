# Analysis Engine Benchmark Notes

## Purpose
This file documents the manually verified benchmark tracks for the structure-analysis engine.
The goal is to compare engine output against real hearing checks and identify repeatable failure patterns.

---

## Solar Vision - Coming Home Again (Original Mix)
- Status: strong positive reference
- Overall verdict: very good
- Notes:
  - S1 correct
  - S2 correct
  - S3 correct
  - S4 correct
  - S5 correct
  - S6 correct
  - S7 correct
  - Outro change was correctly captured
- Use:
  - positive benchmark for macro structure detection
  - positive benchmark for outro recognition

---

## Above & Beyond, Zoe Johnston - Crazy Love feat. Zoë Johnston (Extended Mix)
- Status: important problem reference
- Overall verdict: mostly good, but one important boundary was too early
- Notes:
  - Section 7 started too early
  - Cause confirmed by hearing: vocals before the drop were interpreted as structural change
  - The true new section should begin later at the actual drop
- Use:
  - benchmark for false early boundary caused by pre-drop vocal change

---

## Hardwell - OH GOSH (Original Mix)
- Status: strong negative reference
- Overall verdict: clearly wrong
- Notes:
  - structure felt shifted and logically off
  - early and mid boundaries did not match the real arrangement well
- Use:
  - benchmark for major segmentation failure
  - benchmark for detecting globally misaligned structure output

---

## Rezz, fknsyd, Anyma (ofc) - Entropy feat. Fknsyd (Extended Mix)
- Status: positive reference
- Overall verdict: good
- Notes:
  - bpm correct
  - main sections were well detected
  - some shorter internal sections were not captured
- Use:
  - benchmark for good macro segmentation with slightly coarse granularity

---

## Marlon Hoffstadt, Dimension, DJ Daddy Trance - It_s That Time (Dimension Remix) (Original Mix)
- Status: mixed reference
- Overall verdict: usable, but somewhat coarse
- Notes:
  - measured tempo was sensible as double-time for engine purposes
  - track contains many changes while still feeling repetitive
  - engine captured some changes well, but missed smaller sections
- Use:
  - benchmark for dense change activity on a repetitive foundation

---

## David Forbes - Techno Is My Only Drug (Mixed)
- Status: positive reference with timing drift
- Overall verdict: good overall
- Notes:
  - S1 should end around 00:26, engine ended it too early
  - S2 therefore started too early
  - S3 correct
  - S4 ended too late and should end around 02:10
  - S5 correct
  - small acid variations did not need separate structural sections
- Use:
  - benchmark for generally good macro segmentation with timing errors at specific boundaries

---

## Current Lessons
- The engine is already useful for macro structure detection.
- The main weakness is boundary timing, not total instability.
- Pre-drop vocals can create false early boundaries.
- Smaller internal sections are often missed.
- Some tracks are segmented too coarsely.
- Not every sound change should become a new section.

## Verified Boundary Patterns

### 1) Clean hard boundary
**Reference case:** David Forbes - Techno Is My Only Drug (Mixed), boundary at bar 8

**Observed data**
- novelty: 0.699509
- delta_from_prev: 1749.446424
- similarity_prev_to_here: 0.711843
- similarity_here_to_next: 0.994732
- next_similarity: 0.996029

**Interpretation**
This is a clean section boundary.
The previous state breaks clearly, and the new state becomes stable immediately after the boundary.

**Lesson**
A strong boundary is not just a local change spike.
It should also show immediate post-boundary stability.

---

### 2) Early pre-drop boundary
**Reference case:** Above & Beyond, Zoe Johnston - Crazy Love feat. Zoë Johnston (Extended Mix), boundary at bar 145

**Observed data**
- novelty: 0.594490
- delta_from_prev: 3320.070884
- similarity_prev_to_here: 0.734287
- similarity_here_to_next: 0.882378
- next_similarity: 0.991720
- next_next_similarity: 0.988617

**Interpretation**
The engine catches a real change, but it appears to be the start of a transition or pre-drop event rather than the musically preferred main boundary.
In listening validation, the boundary was perceived as too early because vocals before the drop triggered the change response.

**Lesson**
The strongest early change inside a transition is not always the best section boundary.
The engine must later distinguish between transition onset and musically dominant arrival point.

---

### 3) Weak gradual/outro boundary
**Reference case:** David Forbes - Techno Is My Only Drug (Mixed), boundary at bar 83

**Observed data**
- novelty at candidate bar 83: 0.163368
- delta_from_prev at bar 83: 123.473418
- similarity_prev_to_here at bar 83: 0.996248
- similarity_here_to_next at bar 83: 0.998693
- stronger later disruption:
  - bar 84 -> 85 similarity: 0.698276
  - delta_from_prev at bar 85: 1879.227912

**Interpretation**
The chosen boundary is weak and does not represent a clear hard break.
The structural change is more gradual and smeared across several bars.

**Lesson**
Peak picking on novelty alone is not enough for gradual transitions or outros.
Later boundary logic must handle smeared exits separately from hard section starts.

---

## Current Boundary Takeaways

From the validated benchmark cases, the current issue is not primarily the beat/bar grid.
The main problem is boundary semantics on top of novelty and similarity.

Current verified boundary types:
1. clean hard boundary
2. early pre-drop boundary
3. weak gradual/outro boundary

These patterns should guide the next boundary-scoring design step.

## Validierter Debug-Befund: late novelty drift suspect

### Ziel
Ein später Novelty-Peak soll als verdächtig gelten, wenn lokal kaum echter Wechsel sichtbar ist.

### Aktuelle Debug-Regel
Ein Kandidat wird als `late_novelty_drift_suspect` markiert, wenn:

- `delta_from_prev < 0.05`
- `similarity_prev_to_here > 0.95`

Wichtig:
Diese Regel ist aktuell nur Debug-Auswertung außerhalb der Pipeline.
Sie verändert keine Kandidaten, keine Scores und keine Section-Setzung.

### Validierte Fälle

#### David Forbes – Techno Is My Only Drug
Hörurteil:
- Bar 83 / 02:19.02 ist kein spürbarer echter Wechsel
- echter Wechsel eher um ca. 02:10 / ungefähr Bar 77

Debug-Ergebnis:
- Bar 83 wurde als `late_novelty_drift_suspect` markiert
- die übrigen relevanten Kandidaten wurden nicht fälschlich markiert

Bedeutung:
- der späte Novelty-Peak wird korrekt als wahrscheinlich zu spät erkannt
- lokaler echter Wechsel lag früher als der finale Peak

#### Solar Vision – Coming Home Again
Debug-Ergebnis:
- kein Kandidat wurde als `late_novelty_drift_suspect` markiert

Bedeutung:
- die Regel bleibt in diesem guten Referenzfall sauber
- bisher kein Hinweis auf eine offensichtliche Fehlmarkierung in diesem Track

### Zwischenfazit
Die Debug-Regel ist derzeit in zwei echten Fällen brauchbar:

- problematischer Spät-Peak wurde korrekt markiert
- guter Referenzfall blieb sauber

Das ist noch keine Freigabe für die Hauptpipeline.
Vor einer echten Übernahme sind weitere Referenzfälle nötig.

## Validierter Debug-Befund: early peak before stable arrival

Bei **Crazy Love** wurde der problematische Bereich um **Bar 145** lokal geprüft.

Lokale Werte:

- Bar 145 → novelty 0.5945, delta 0.4801, prev_sim 0.5199, forward 0.8773
- Bar 146 → delta 0.5459, forward 0.9899
- Bar 147 → forward 0.9821
- Bar 148 → forward 0.9879
- Bar 149 → prev_sim 0.9616

Bedeutung:

- Der Peak bei Bar 145 ist **kein late novelty drift suspect**
- Es gibt dort **einen realen Wechsel**
- Aber die stabilere neue Phase liegt wahrscheinlich **1–3 Bars später**
- Das passt zum bereits validierten Hörbefund:
  **pre-drop vocal / Vorveränderung wird zu früh als Boundary gelesen, echte Ankunft kommt später**

Wichtige Schlussfolgerung:

Dieser Fall darf **nicht** mit late novelty drift verwechselt werden.

Vorläufige Lesart:

- **late novelty drift** = Peak kommt zu spät, obwohl lokal kaum echter Wechsel vorliegt
- **early peak before stable arrival** = Peak kommt früh auf eine Vorveränderung, stabile neue Phase folgt kurz danach

Diese Muster müssen in der Boundary-Logik getrennt gedacht werden.

## Minimal Boundary Types

### Normal boundary
Nutzen, wenn:
- novelty klar sichtbar ist
- delta_from_prev erhöht ist
- similarity_prev_to_here spürbar fällt
- forward_stability danach brauchbar ist

Bedeutung:
- echter Wechsel
- neue Phase beginnt direkt hier

### Late novelty drift
Nutzen, wenn:
- novelty hoch ist
- delta_from_prev sehr niedrig bleibt
- similarity_prev_to_here sehr hoch bleibt
- forward_stability trotzdem hoch ist

Bedeutung:
- Peak kommt zu spät
- kaum echter lokaler Wechsel
- Boundary ist wahrscheinlich nach rechts gedriftet

### Early peak before stable arrival
Nutzen, wenn:
- novelty hier schon hoch ist
- delta_from_prev hier schon vorhanden ist
- die stabilere Ankunft aber erst 1–3 Bars später liegt
- dort die forward_stability klar besser wird

Bedeutung:
- früher Peak auf Vorveränderung
- echte neue Hauptphase kommt kurz danach

### Bewusst noch nicht Teil dieser Regelbasis
- keine Genre-Branches
- keine komplizierten Scores
- keine Extra-Metriken
- keine automatische Verschiebelogik in der Pipeline

## Validierter Debug-Befund: kombinierte Boundary-Klassifikation

Die aktuelle Debug-Klassifikation wurde bewusst nur an Referenzfällen geprüft und noch nicht in die Hauptpipeline übernommen.

### Validierte Referenzfälle

- **David Forbes – Techno Is My Only Drug**
  - **Bar 83 / 02:19.02** wird korrekt als `late_novelty_drift_suspect` markiert.
  - Frühere Kandidaten wie **Bar 8**, **15**, **39**, **56** und **61** bleiben `normal_candidate`.

- **Above & Beyond, Zoe Johnston – Crazy Love**
  - **Bar 145 / 04:23.04** wird korrekt als `early_peak_before_stable_arrival_suspect` markiert.
  - Kandidaten wie **Bar 32**, **55**, **72** und **177** werden nicht mehr fälschlich als Early-Arrival-Suspect markiert und bleiben `normal_candidate`.

### Aktuell validierte Debug-Regellogik

#### late novelty drift suspect
Ein Kandidat wird nur dann als `late_novelty_drift_suspect` markiert, wenn der Novelty-Peak sichtbar ist, aber der eigentliche Strukturwechsel an dieser Bar selbst schwach ist und eher auf verspätete Novelty-Reaktion hindeutet.

#### early peak before stable arrival
Ein Kandidat wird nur dann als `early_peak_before_stable_arrival_suspect` markiert, wenn:
- Novelty klar sichtbar ist,
- Delta ausreichend stark ist,
- die aktuelle Bar noch genügend Ähnlichkeit zur Vorbar hat,
- die aktuelle Bar bereits eine gewisse Vorwärtsstabilität besitzt,
- und kurz danach eine noch stabilere Ankunft folgt.

### Wichtig
Dieser Stand ist nur als **validierter Debug-Befund** zu verstehen.

Noch nicht tun:
- keine Übernahme in `novelty.py`
- kein Umbau der Hauptpipeline
- keine automatische Boundary-Verschiebung
- keine zusätzliche Heuristik-Kette ohne neue Referenzprüfung

## Validierter Debug-Stand: Boundary-Klassifizierung

Aktueller validierter Debug-Stand der Boundary-Klassifizierung nach manueller Prüfung:

- Solar Vision - Coming Home Again:
  - alle Kandidaten bleiben `normal_candidate`
  - aktuell kein False Positive für `late_novelty_drift_suspect`
  - aktuell kein False Positive für `early_peak_before_stable_arrival_suspect`

- David Forbes - Techno Is My Only Drug:
  - Kandidat bei Bar 83 bleibt ein valider Fall für `late_novelty_drift_suspect`
  - die übrigen Kandidaten bleiben aktuell `normal_candidate`

- Above & Beyond - Crazy Love:
  - Kandidat bei Bar 145 bleibt ein valider Fall für `early_peak_before_stable_arrival_suspect`
  - die übrigen Kandidaten bleiben aktuell `normal_candidate`

Zwischenfazit:
Die aktuelle Debug-Klassifizierung ist noch keine produktive Boundary-Logik.
Aber der derzeitige Minimalstand trennt in den bisher geprüften Referenzfällen brauchbar zwischen:
- normal_candidate
- late_novelty_drift_suspect
- early_peak_before_stable_arrival_suspect

Wichtig:
Vor einer echten Übernahme in die Pipeline muss diese Logik noch an weiteren Referenztracks geprüft werden.

## Validierter Debug-Befund: conservative shift pass

Der aktuelle konservative Shift-Durchlauf ist als Debug-Zwischenschritt deutlich sauberer als die frühere aggressivere Variante.

Validierte verbleibende Shift-Fälle im aktuellen Debug-Stand:
- David Forbes: Bar 56 -> 57
- Solar Vision: Bar 56 -> 57
- Crazy Love: Bar 32 -> 33
- Crazy Love: Bar 96 -> 97

Wichtige Negativ-Befunde im aktuellen Debug-Stand:
- David Forbes: Bar 15 bleibt korrekt auf stay
- David Forbes: Bar 83 bleibt korrekt auf stay
- Solar Vision: Bar 17 bleibt korrekt auf stay
- Crazy Love: Bar 145 bleibt korrekt auf stay
- Crazy Love: Bar 177 bleibt korrekt auf stay

Interpretation:
- Die aktuelle Debug-Logik ist jetzt bewusst konservativ.
- Problematische Überverschiebungen wurden im Benchmark deutlich reduziert.
- Der Stand ist als Debug-Befund brauchbar, soll aber noch nicht blind in die Haupt-Engine übernommen werden.
- Vor einer echten Übernahme braucht es weitere Hörvalidierung und danach erst eine saubere Integrationsentscheidung.

## Validierter Debug-Befund: forward-stability guard for conservative shift pass

Der konservative Shift-Pass wurde weiter eingegrenzt, damit kein Shift aus sehr instabilen Kandidaten heraus empfohlen wird.

Validierter Stand nach der Anpassung:
- Rezz / Entropy: Bar 36 bleibt korrekt auf 36.
- David Forbes / Techno Is My Only Drug: Bar 56 → 57 bleibt sinnvoll.
- Solar Vision / Coming Home Again: Bar 56 → 57 bleibt sinnvoll.
- Crazy Love: Bar 32 → 33 bleibt sinnvoll.
- Crazy Love: Bar 96 → 97 bleibt sinnvoll.
- David Forbes: Bar 83 bleibt korrekt auf 83.
- Solar Vision: Bar 17 bleibt korrekt auf 17.
- Crazy Love: Bar 145 bleibt korrekt auf 145.

Zwischenfazit:
Ein zusätzlicher Guard auf die aktuelle forward_stability macht den Shift-Pass robuster und verhindert unnötige Verschiebungen aus bereits schwachen oder instabilen Ausgangskandidaten.

Wichtig:
Das ist weiterhin ein Debug-Befund und noch keine Produktionslogik. Vor einer echten Übernahme in die Pipeline muss die Regel mit weiteren Tracks geprüft werden.

## Validierter Debug-Befund: ambiguous +1 shift case at Bob 128

Der Fall Bob Sinclar / Fisher Rework bei Boundary-Bar 128 ist ein validierter Grenzfall gegen den konservativen Shift-Pass.

Hörurteil:
- 128 ist korrekt.
- 129 ist zu spät.

Messbild:
- 128 hat bereits starke Boundary-Signale.
- 129 zeigt trotzdem die typische Debug-Verbesserung bei `forward_stability` und zusätzlich höheres `delta_from_prev`.
- Damit sieht 128 → 129 in den aktuellen drei Signalen formal ähnlich aus wie valide +1-Fälle.

Schluss:
- Mit nur `novelty_curve`, `bar_delta_from_prev` und `bar_forward_stability` ist dieser Fall derzeit nicht robust von guten +1-Shifts trennbar.
- Weitere Threshold-Verschärfung wäre Blindflug und würde voraussichtlich gute Fälle beschädigen.

Konsequenz:
- Keine weitere Threshold-Optimierung für den konservativen Shift-Pass auf Basis dieser drei Signale allein.
- Bob 128 bleibt als dokumentierter Counterexample im Benchmark.
- Ein späterer neuer Shift-Versuch braucht zusätzliche Evidenz jenseits der aktuellen drei Debug-Signale.

## Vorläufige Entscheidung: conservative boundary shift bleibt Debug-only

Der konservative Boundary-Shift-Pass bleibt vorläufig ein reiner Debug-Mechanismus und wird nicht in die echte Boundary-Pipeline übernommen.

Begründung:
- Einige +1-Fälle wirken im Hörvergleich sinnvoll.
- Gleichzeitig existieren validierte Gegenbeispiele, insbesondere Bob 128, die mit den aktuellen drei Signalen nicht robust trennbar sind.
- Weitere Threshold-Anpassungen auf derselben Signalbasis wären nicht belastbar genug.

Arbeitsentscheidung:
- Die aktuelle Boundary-Pipeline bleibt unverändert.
- `debug_candidate_shift_recommendation.py` und `debug_apply_boundary_shift.py` bleiben Debug-Werkzeuge.
- Ein zukünftiger echter Shift-Ansatz wird nur dann neu geprüft, wenn zusätzliche Evidenzsignale definiert und separat validiert wurden.

## Validierter Benchmark-Befund: two different near-boundary failure types in Freaky 1

Track:
- Ali Love, Vintage Culture, Max Styler – Freaky 1 (Original Mix)

Im produktiven Pass-through-Stand wurden 14 final_boundaries an `sections.py` übergeben.
`sections.py` übernahm davon 12 Boundary-Bar-Indizes und entfernte 2 nahe Nachbarn:
- 59
- 106

Grund:
- 59 liegt nur 7 Bars nach 52
- 106 liegt nur 4 Bars nach 102
- bei `min_section_bars = 8` werden diese Kandidaten in `sections.py` korrekt verworfen

Wichtiger Befund:
Diese zwei entfernten Kandidaten sind musikalisch / technisch nicht vom gleichen Typ.

### Falltyp 1: starker Cluster-Fall

Boundary-Paar:
- 52 / 59

Befund:
- 52 zeigt einen starken echten Wechsel
- 59 zeigt ebenfalls starke Boundary-Signale
- 59 wirkt nicht wie bloßes Rauschen oder schwacher Nachzügler
- der Kandidat wird aktuell nur wegen Mindestabstand entfernt

Bedeutung:
Das ist kein Shift-Fall.
Das ist ein Cluster-Fall mit zwei nahen starken Kandidaten.
Eine spätere produktive Lösung braucht hier eher Cluster-Entscheidung als Boundary-Shift.

### Falltyp 2: schwacher Doppel-Kandidat

Boundary-Paar:
- 102 / 106

Befund:
- 102 wirkt wie die eigentliche Boundary
- 106 hat deutlich schwächere Boundary-Evidenz
- 106 zeigt nur kleines `delta_from_prev`, hohe `similarity_prev_to_here` und hohe `forward_stability`
- 106 wirkt eher wie ein später Rest-/Nachschwing-Kandidat innerhalb derselben neuen Phase

Bedeutung:
Das ist kein echter Konkurrenzfall wie 52 / 59.
Das ist ein schwacher Doppel-Kandidat, der plausibel verworfen werden kann.

Konsequenz:
Der Track liefert zwei klar getrennte Fehlertypen für nahe Kandidaten:
- starker Cluster-Fall
- schwacher Doppel-Kandidat

Wichtig für die weitere Engine-Arbeit:
Die nächste produktive Logik sollte nicht pauschal auf Boundary-Shift zielen, sondern zwischen diesen beiden Falltypen unterscheiden können.

## Validierter Benchmark-Befund: removed near-boundary cases across four benchmark tracks

Verwendetes Debug-Tool:
- `analysis_engine/debug_classify_removed_near_boundaries.py`

Geprüfte Tracks:
- Ali Love, Vintage Culture, Max Styler – Freaky 1 (Original Mix)
- Solar Vision – Coming Home Again (Original Mix)
- David Forbes – Techno Is My Only Drug (Mixed)
- Above & Beyond, Zoe Johnston – Crazy Love feat. Zoë Johnston (Extended Mix)

Ergebnis:

### Freaky 1
Entfernte Near-Boundaries vorhanden:
- 52 -> 59 = `strong_cluster`
- 102 -> 106 = `weak_duplicate`

Bedeutung:
Freaky 1 bleibt der aktuell klar verifizierte Referenz-Track für zwei verschiedene entfernte Near-Boundary-Fehlertypen.

### Solar Vision
- keine entfernten Near-Boundaries

### David Forbes
- keine entfernten Near-Boundaries

### Crazy Love
- keine entfernten Near-Boundaries

Konsequenz:
Das Problem ist im aktuellen Benchmark-Stand nicht breit über alle geprüften Tracks verteilt.
Mit dem präzisen Removed-Near-Boundary-Debug ist es aktuell klar nur in Freaky 1 nachweisbar.

## Ergänzender Benchmark-Befund: Bob Sinclar removed near-boundary check

Zusätzlich geprüft mit:
- `analysis_engine/debug_classify_removed_near_boundaries.py`

Track:
- Bob Sinclar – World Hold On feat. Steve Edwards (Fisher Rework, Extended Mix)

Ergebnis:
- keine entfernten Near-Boundaries

Konsequenz:
Auch nach Einbezug von Bob Sinclar bleibt der aktuell klar verifizierte Removed-Near-Boundary-Fall im Benchmark-Stand auf Freaky 1 isoliert.
