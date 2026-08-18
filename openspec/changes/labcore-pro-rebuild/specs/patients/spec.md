# Patients Specification

## Purpose

Patient demographic CRUD with cédula validation, indexed instant search, soft-delete (never hard-delete), per-patient history, and duplicate merge. Single-lab scope (no sede dimension, per D4).

## Requirements

### Requirement: Patient CRUD with cédula [FR M2.1, N9.3]

The system MUST support patient create/read/update with cédula (V-/E- prefix), names, DOB, sex (M/F/O), phone, email, and address. All UI strings MUST be es-VE.

#### Scenario: Reception creates a patient

- GIVEN a reception user is authenticated
- WHEN the user creates a patient with cédula V-12345678
- THEN the patient is persisted and appears in the patient list

### Requirement: Cédula uniqueness and validation [FR M2.2]

The system MUST enforce cédula uniqueness and MUST validate the V-/E- format before persistence.

#### Scenario: Duplicate cédula is rejected

- GIVEN a patient with cédula V-12345678 exists
- WHEN a second patient is created with the same cédula
- THEN persistence is rejected with a plain-Spanish duplicate error

### Requirement: Indexed instant search [FR M2.3, N5.1]

The system MUST search by cédula, name, or phone and return results in < 100 ms for up to 50k rows using indexed columns.

#### Scenario: Search stays fast at scale

- GIVEN 50k patients exist
- WHEN the user types a cédula fragment
- THEN matching patients appear within 100 ms as the user types

### Requirement: Soft-delete with audit [FR M2.4, N2.6]

The system MUST deactivate (soft-delete) patients and MUST NOT hard-delete patients that have orders/results. The action MUST be audited. No native `confirm` dialog; a typed confirm dialog MUST be used.

#### Scenario: Patient with orders is deactivated not removed

- GIVEN a patient with prior orders
- WHEN the user attempts to delete the patient
- THEN the patient is deactivated (not removed), referenced data is preserved, and the action is audited

### Requirement: Patient history view [FR M2.5]

The system MUST display a patient's full history: all prior orders with status, exams, results, and payment state.

#### Scenario: History lists all past orders

- GIVEN a patient with three past orders
- WHEN the user opens the patient history view
- THEN all three orders with their results and payment state are listed chronologically

### Requirement: Duplicate patient merge [FR M2.6] (Should — v2.0 if capacity allows)

The system SHOULD merge duplicate patients by cédula with conflict resolution, fixing the v1 broken merge path.

#### Scenario: Merge with conflict preview

- GIVEN two patient records share the same cédula
- WHEN the admin initiates a merge
- THEN the records are consolidated with a conflict preview before applying

### Requirement: Cédula and phone masks [N8.2]

The system MUST apply input masks for cédula (V-/E-) and phone fields during entry.

#### Scenario: Cédula mask enforces prefix

- GIVEN the user types digits into a cédula field
- WHEN the input is processed
- THEN the V- prefix is applied and formatting is enforced
