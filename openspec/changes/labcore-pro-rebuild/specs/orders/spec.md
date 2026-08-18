# Orders Specification

## Purpose

Order creation with an exam list, referring doctor, and clinical notes; status workflow; and lock-after-finalize. Single-lab scope (no sede, D4). Insurers/price lists are deferred (D7); order total is computed from exam prices directly.

## Requirements

### Requirement: Create order with exam list and medico [FR M5.1, D4]

The system MUST create an order with a patient, one or more exams, a medico referente, and clinical observations. No sede dimension exists (D4).

#### Scenario: Order with exams and medico is persisted

- GIVEN a patient and two exams exist
- WHEN the reception user creates an order with both exams and a medico
- THEN the order and its exam list are persisted via the `orden_examenes` junction

### Requirement: Order status workflow [FR M5.2]

The system MUST enforce the order status workflow: Pendiente → Procesando → Completada → Entregada.

#### Scenario: Order advances through statuses

- GIVEN an order is Pendiente
- WHEN results are captured and validated
- THEN the order transitions to Completada, and on delivery to Entregada

### Requirement: orden_examenes junction persisted [FR M5.3]

The system MUST persist which exams belong to an order in the `orden_examenes` junction (v1 inferred this from results, which was broken).

#### Scenario: Junction rows exist before results

- GIVEN an order is created with three exams
- WHEN the order is saved
- THEN three junction rows exist regardless of whether results are captured yet

### Requirement: Order total from exam prices [FR M5.4, D7]

The system MUST compute the order total from the exam prices of its exam list. Price lists/empresas are deferred (D7).

#### Scenario: Total is the sum of exam prices

- GIVEN an order has two exams priced 500 and 300 Bs
- WHEN the order total is computed
- THEN the total is 800 Bs

### Requirement: Edit before completion, lock after finalize [FR M5.5]

The system MUST allow editing an order before completion and MUST lock it after finalization.

#### Scenario: Locked order rejects edits

- GIVEN an order is Completada
- WHEN the user attempts to add an exam
- THEN the edit is rejected because the order is locked

### Requirement: Order observations / clinical notes [FR M5.6]

The system MUST store order-level observations / clinical notes.

#### Scenario: Observation is persisted and shown on report

- GIVEN an order is being created
- WHEN the user enters "Ayunas 12h"
- THEN the observation is persisted and visible on the order and report

### Requirement: Cancel/void order with reason [FR M5.7] (Should — v2.0 if capacity allows)

The system SHOULD allow canceling/voiding an order with a reason and an audit entry.

#### Scenario: Void with reason is audited

- GIVEN an order is Pendiente
- WHEN the admin voids it with reason "Muestra rechazada"
- THEN the order is marked voided, the reason is stored, and the action is audited
