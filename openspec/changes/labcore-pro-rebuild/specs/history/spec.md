# History Specification

## Purpose

Global order history with filters and the ability to re-print or re-export any past order. Replaces v1's unfiltered list.

## Requirements

### Requirement: Global order history [FR M10.1]

The system MUST display a global history of orders showing patient, cédula, date, status, exams, total, and payment state.

#### Scenario: History lists all orders with key fields

- GIVEN orders exist across several days
- WHEN the user opens the history module
- THEN all orders are listed with patient, cédula, date, status, exams, total, and payment state

### Requirement: History filters [FR M10.2]

The system MUST filter history by date range, patient, status, and payment state.

#### Scenario: Filter by payment state

- GIVEN the history contains paid and unpaid orders
- WHEN the user filters by payment state "Pendiente"
- THEN only orders with a pending balance are shown

### Requirement: Re-print and re-export past orders [FR M10.3]

The system MUST allow re-printing and re-exporting any past order from history.

#### Scenario: Past order is re-printed

- GIVEN a Completada order from last month
- WHEN the user selects re-print
- THEN the validated report PDF is regenerated and printable

### Requirement: Patient-specific timeline [FR M10.4] (Should — v2.0 if capacity allows)

The system SHOULD provide a patient-specific timeline view of all that patient's orders.

#### Scenario: Patient timeline lists all orders chronologically

- GIVEN a patient with five past orders
- WHEN the user opens the patient timeline
- THEN the five orders are listed chronologically with status and results
