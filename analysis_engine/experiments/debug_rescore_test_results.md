# Debug Rescore Test Results

## Verified behavior of the current local rescoring idea

The first debug-only rescoring test produced a mixed but useful result:

- **Crazy Love / base 145** → winner stayed at **145**
- **David Forbes / base 83** → winner moved from **83** to **85**
- **David Forbes / base 8** → winner stayed at **8**

## Interpretation

This means the current local rescoring logic is already useful for one specific failure type:

- **early boundary chosen, but a later bar is the better arrival**
- confirmed by **David Forbes / 83 -> 85**

It also appears reasonably safe in at least one case where we do **not** want a forced later shift:

- **Crazy Love / 145 stays 145**

However, the same logic does **not** solve the other verified pattern:

- **David Forbes / 8 stays 8**
- even though the musically better section start is later

## Important conclusion

We are not dealing with one single boundary error class.

At least two distinct classes now exist:

1. **Late-arrival correction case**
   - the current rescoring idea may help
   - example: David Forbes / 83

2. **Early entry / intro-shift case**
   - the current rescoring idea is not enough
   - example: David Forbes / 8

## Design consequence

Do not push this formula into the real pipeline yet.

First, keep it as a debug-only scoring prototype and explicitly note:

- current rescoring is promising for **later-arrival replacement**
- current rescoring is **not sufficient** for **early entry-shift correction**
- a separate design step is needed for intro-entry / first-stable-arrival handling
