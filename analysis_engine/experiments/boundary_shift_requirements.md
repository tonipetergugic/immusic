# Boundary Shift Requirements

## Ziel
Der bisherige konservative Shift-Pass hat gezeigt, dass reine Entscheidungen auf Basis von
- novelty
- delta_from_prev
- forward_stability

nicht robust genug sind, um Boundary-Verschiebungen sicher in die echte Pipeline zu übernehmen.

## Aktuelle Arbeitsentscheidung
Die bestehende Boundary-Pipeline bleibt unverändert.
Alle Shift-Mechanismen bleiben vorläufig reine Debug-Werkzeuge.

## Was für einen echten Shift künftig zusätzlich gebraucht wird

### 1. Arrival-Signal
Ein echtes Signal dafür, ob an der Ziel-Bar wirklich eine neue musikalische Ankunft beginnt
und nicht nur eine fortlaufende Vorbewegung oder ein Übergang.

### 2. Landing-Persistence
Ein Signal dafür, ob die Ziel-Bar und die direkt folgenden Bars gemeinsam wie ein stabiler
neuer Zustand wirken, statt nur wie ein kurzer Peak oder Nebeneffekt.

### 3. Pre-vs-Post Contrast Shape
Ein Signal, das nicht nur die Größe einer Änderung misst, sondern die Form der Änderung:
- baut sich vorher etwas auf?
- landet danach wirklich etwas?
- ist der eigentliche Wechsel an der Boundary oder schon davor?

### 4. Local Transition Context
Ein Signal, das die Boundary im kleinen lokalen Fenster bewertet:
- letzte Bars davor
- Boundary-Bar selbst
- erste Bars danach

### 5. Boundary Class Awareness
Ein späterer Shift darf nicht für alle Boundary-Typen gleich behandelt werden.
Früher Einstieg, echte Landung, spätes Driften und vokalbedingte Scheinwechsel
müssen getrennt betrachtet werden.

## Konsequenz
Bevor diese Zusatzsignale nicht separat definiert und validiert sind,
wird kein Debug-Shift in die echte Pipeline übernommen.
