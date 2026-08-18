# Sampling Specification

## Purpose

Sample registration and status tracking per order/exam, with barcode labels and reject-with-reason as v2.0 Shoulds.

## Requirements

### Requirement: Sample registration per order/exam [FR M6.1]

The system MUST register a sample per order/exam using the sample type from the catalog.

#### Scenario: Samples are registered per exam

- GIVEN an order with two exams each requiring blood and urine samples
- WHEN the technician registers samples for the order
- THEN one sample row per exam is persisted with the correct sample type

### Requirement: Sample status workflow [FR M6.2]

The system MUST track sample status: Recolectada → En proceso → Resultada.

#### Scenario: Sample advances to Resultada on validation

- GIVEN a sample is Recolectada
- WHEN the result for that sample is validated
- THEN the sample status becomes Resultada

### Requirement: Barcode label generation [FR M6.3] (Should — v2.0 if capacity allows)

The system SHOULD generate a sample ID and print a barcode label.

#### Scenario: Label is printed for a registered sample

- GIVEN a sample is registered
- WHEN the technician requests a label
- THEN a barcode label with the sample ID is printed

### Requirement: Reject sample with reason [FR M6.4] (Should — v2.0 if capacity allows)

The system SHOULD allow rejecting a sample with a reason (hemólisis, coágulo, volumen insuficiente).

#### Scenario: Rejected sample stores reason and audits

- GIVEN a sample is Recolectada
- WHEN the technician rejects it with reason "Hemólisis"
- THEN the sample is marked rejected, the reason is stored, and the action is audited
