# Médico Referente Specification

## Purpose

Referring-doctor CRUD, selectable on an order, and shown on the patient report. Per-medico stats are a Could (post-v2.0).

## Requirements

### Requirement: Referring-doctor CRUD [FR M16.1]

The system MUST support referring-doctor create/read/update with name, cédula, specialty, and phone.

#### Scenario: Doctor is created and selectable

- GIVEN an admin is authenticated
- WHEN the user creates a doctor "Dr. Pérez" with specialty Cardiología
- THEN the doctor is persisted and selectable on orders

### Requirement: Select medico on order and show on report [FR M16.2]

The system MUST allow selecting a medico referente on an order and MUST show the medico on the patient PDF report.

#### Scenario: Medico appears on the report header

- GIVEN an order is created with a selected medico
- WHEN the validated report is generated
- THEN the medico's name and specialty appear on the report header

### Requirement: Stats per medico [FR M16.3] (Could — post-v2.0)

The system MAY provide stats per medico (referrals, revenue).

#### Scenario: Medico stats show referrals and revenue

- GIVEN several orders reference the same medico
- WHEN the medico stats view is opened
- THEN referral count and associated revenue are displayed
