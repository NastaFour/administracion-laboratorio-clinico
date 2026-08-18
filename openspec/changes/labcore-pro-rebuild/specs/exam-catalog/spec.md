# Exam Catalog Specification

## Purpose

Exam, parameter, and reference-range catalog CRUD with qualitative result support, soft-delete, and the tercerizado (outsourced) flag whose provider is internal-only data invisible on patient reports (D7).

## Requirements

### Requirement: Exam CRUD [FR M3.1]

The system MUST support exam create/read/update with code, name, category, sample type, price, and an active flag.

#### Scenario: Admin creates an exam

- GIVEN an admin is authenticated
- WHEN the user creates an exam "Hemograma Completo" with code HEM-01
- THEN the exam is persisted and listed in the catalog

### Requirement: Parameter CRUD per exam [FR M3.2]

The system MUST support parameter CRUD per exam with name, display order, and unit.

#### Scenario: Parameters are added to an exam

- GIVEN exam HEM-01 exists
- WHEN the user adds parameters Hemoglobina, Hematocrito with units g/dL, %
- THEN both parameters are persisted against the exam with their order

### Requirement: Reference-range CRUD per parameter [FR M3.3]

The system MUST support reference-range CRUD per parameter with sex scope (M/F/Ambos), age range, min/max, and interpretation.

#### Scenario: A male adult band is added

- GIVEN parameter Hemoglobina exists
- WHEN the user adds a male adult band 13.5–17.5 g/dL
- THEN the range is persisted and available for selection at entry

### Requirement: Qualitative/categorical results [FR M3.4]

The system MUST support qualitative result types (Reactivo/No Reactivo, Positivo/Negativo, trace/1+/2+/3+) alongside numeric results.

#### Scenario: Qualitative parameter accepts categorical values

- GIVEN a serology parameter is configured as qualitative
- WHEN results are captured for it
- THEN the entry control accepts categorical values, not numbers

### Requirement: Soft-delete, no hard-delete of referenced rows [FR M3.5]

The system MUST soft-delete exams and parameters (active flag) and MUST NOT hard-delete any catalog row referenced by results.

#### Scenario: Referenced exam is deactivated not removed

- GIVEN an exam is referenced by a finalized result
- WHEN the user attempts to delete the exam
- THEN it is deactivated (not removed) and referenced results stay intact

### Requirement: Tercerizado flag with internal provider [D7]

The system MUST allow marking an exam as tercerizado (outsourced) with a provider name. The provider name is INTERNAL data and MUST NOT appear on the patient report. Third-party results are transcribed manually.

#### Scenario: Provider is invisible on the report

- GIVEN an exam is marked tercerizado with provider "Lab Externo C.A."
- WHEN the patient PDF report is generated
- THEN the provider name is absent from the report; the result is shown as a transcribed value

### Requirement: Catalog import/export [FR M3.6] (Should — v2.0 if capacity allows)

The system SHOULD import/export the catalog as JSON/CSV.

#### Scenario: Catalog is imported with conflict preview

- GIVEN a valid catalog JSON file
- WHEN the admin imports it
- THEN exams/parameters/ranges are upserted with a conflict preview
