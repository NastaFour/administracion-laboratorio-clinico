# Audit Log Specification

## Purpose

Append-only, tamper-evident audit log with an admin viewer. Every clinical, payment, config, user-management, print, and export/import action is recorded.

## Requirements

### Requirement: Append-only audit_log table [FR M12.1, N2.4]

The system MUST maintain an append-only `audit_log` table recording actor (usuario), action, entity, entity_id, before/after JSON, and timestamp.

#### Scenario: Edit records before and after JSON

- GIVEN an admin edits a patient record
- WHEN the edit is saved
- THEN an audit row is inserted with the before and after JSON and the admin's id

### Requirement: Audit scope [FR M12.2]

The system MUST audit: patient create/edit/delete, order create/edit/cancel, result validate/reject/reopen, payment, config change, user management, print, and export/import.

#### Scenario: Validation is audited

- GIVEN a bioanalist validates a result
- WHEN validation is applied
- THEN an audit entry is inserted for the validate action with the result id

### Requirement: Admin audit viewer with filters [FR M12.3]

The system MUST provide an admin-only audit viewer with filters by actor, action, entity, and date range.

#### Scenario: Admin filters by actor

- GIVEN an admin is authenticated
- WHEN the admin filters the audit log by actor "tecnico01"
- THEN only entries by that actor are shown

#### Scenario: Non-admin is denied

- GIVEN a recepcion user is authenticated
- WHEN the user attempts to open the audit viewer
- THEN access is denied

### Requirement: Audit immutability [FR M12.4]

The system MUST NOT allow UPDATE or DELETE on audit_log rows.

#### Scenario: Mutation is rejected

- GIVEN an audit row exists
- WHEN any process attempts to update or delete it
- THEN the operation is rejected at the repository layer
