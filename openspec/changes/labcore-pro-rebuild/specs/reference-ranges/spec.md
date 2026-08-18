# Reference Ranges Specification

## Purpose

Clinical-critical reference-range model and selection. Fixes the v1 bug where result-entry showed an arbitrary (unfiltered) reference row. Ranges are sex-aware and age-unit-aware in days/months/years, including neonates (D9).

## Requirements

### Requirement: Age-unit-aware ranges (days/months/years) [FR M4.1, D9]

The system MUST store reference ranges with an age unit of days, months, or years and an age value, so neonate (days), infant (months), and adult (years) bands coexist on one parameter.

#### Scenario: Neonate and adult bands coexist

- GIVEN a hemoglobin parameter has a neonate band (0–30 days) and an adult band (18+ years)
- WHEN the catalog is queried for all bands of that parameter
- THEN both bands are returned with their distinct age units and ranges

### Requirement: Sex-aware selection at result entry [FR M4.2]

The system MUST select the reference range matching the patient's sex AND exact age at result-entry time (the v1 defect was a missing sex/age WHERE filter in `db:getParams`).

#### Scenario: Only the matching sex/age band is shown

- GIVEN a male patient age 35 and a parameter with sex-specific adult bands
- WHEN the bioanalist opens result capture for that parameter
- THEN only the male adult band is shown as the reference, not an arbitrary row

### Requirement: Exact age from DOB [FR M4.3]

The system MUST compute exact age (years + months, and days for neonates) from the patient's DOB at both entry and report time.

#### Scenario: Neonate age in days selects neonate band

- GIVEN a patient born 12 days ago
- WHEN age is computed for reference selection
- THEN the age is 12 days, selecting the neonate band

### Requirement: Out-of-range flagging [FR M4.4]

The system MUST flag captured values as low, high, or critical relative to the selected band and MUST surface the flag to the bioanalist during entry.

#### Scenario: Low value is flagged

- GIVEN the selected band is 13.5–17.5 g/dL and the captured value is 10.0
- WHEN the value is entered
- THEN it is flagged as low (out of range) and shown to the bioanalist

### Requirement: Multiple bands per parameter [FR M4.5]

The system MUST support multiple reference bands per parameter (neonate, infant, adult, elderly) and select exactly one by sex + age.

#### Scenario: Exactly one band selected by sex and age

- GIVEN a parameter has four age bands
- WHEN selection runs for a 2-month-old female
- THEN exactly the infant-female band is selected

### Requirement: Qualitative interpretation per band [FR M4.6] (Should — v2.0 if capacity allows)

The system SHOULD store a qualitative interpretation text per band (e.g. Reactivo/No Reactivo) instead of a single global interpretation.

#### Scenario: Band-specific interpretation is shown

- GIVEN a serology parameter with qualitative bands
- WHEN a qualitative result is captured
- THEN the band-specific interpretation text is displayed
