# Result Validation Specification

## Purpose

Clinical-critical result capture and the validation state machine. Bioanalist capture validates immediately; technician capture stays pending validation. ONLY validated results can be printed or delivered (D8). The PDF carries the validating bioanalist's signature block.

## Requirements

### Requirement: Capture with sex/age-correct ranges [FR M7.1]

The system MUST show the reference range matching the patient's sex and exact age at capture time, fixing the v1 defect where an unfiltered row was shown.

#### Scenario: Correct band shown at capture

- GIVEN a male patient age 35 and a parameter with sex-specific bands
- WHEN the bioanalist captures a value
- THEN the male-adult reference band is displayed alongside the input

### Requirement: Validation state machine [FR M7.2, D8]

The system MUST enforce the validation state machine: Pendiente → Capturado → Validado, recording `validado_por` and `validado_en`. ONLY Validado results MAY be printed or delivered.

#### Scenario: Technician capture stays pending and unprintable

- GIVEN a technician captures a result
- WHEN the result is saved
- THEN its state is Capturado (pending validation) and it cannot be printed

#### Scenario: Bioanalist validation unlocks printing

- GIVEN a bioanalist validates the captured result
- WHEN validation is applied
- THEN the state becomes Validado with the bioanalist's id and timestamp, and printing is unlocked

### Requirement: Role guard on validation [FR M7.3, D8]

The system MUST restrict validation to bioanalista and admin roles. Technician and recepcion MUST NOT validate.

#### Scenario: Technician cannot validate

- GIVEN a tecnico is authenticated
- WHEN the tecnico attempts to validate a result
- THEN the action is rejected and audited

### Requirement: Reject and rework with reason [FR M7.4]

The system MUST allow rejecting a result back to rework with a reason, and MUST audit every state transition.

#### Scenario: Reject returns to pending with audited reason

- GIVEN a result is Capturado
- WHEN the bioanalist rejects it with reason "Muestra hemolizada"
- THEN the result returns to Pendiente with the reason and an audit entry

### Requirement: Immutability with admin override [FR M7.5]

The system MUST make validated results immutable unless re-opened by an admin override, which MUST be audited.

#### Scenario: Validated result rejects normal edit

- GIVEN a result is Validado
- WHEN a bioanalist attempts to edit the value
- THEN the edit is rejected

#### Scenario: Admin override re-opens and audits

- GIVEN an admin re-opens the result with a stated reason
- WHEN the admin edits and re-validates
- THEN the change and the override reason are audited

### Requirement: Automatic out-of-range flagging [FR M7.6]

The system MUST automatically flag out-of-range and critical values at capture time.

#### Scenario: Critical value is auto-flagged

- GIVEN a captured value exceeds the critical threshold
- WHEN the value is saved
- THEN it is flagged critical and the flag is visible to the bioanalist

### Requirement: Per-exam comments [FR M7.7] (Should — v2.0 if capacity allows)

The system SHOULD support per-exam comments in addition to the order-level observation.

#### Scenario: Per-exam comment is stored and shown on report

- GIVEN a result is being captured
- WHEN the bioanalist adds a per-exam comment
- THEN the comment is stored and shown on the report
