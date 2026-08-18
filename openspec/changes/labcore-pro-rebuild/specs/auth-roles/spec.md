# Auth & Roles Specification

## Purpose

Local authentication, role-based access control, and session management for an offline single-lab desktop app. Every IPC handler is role-guarded; no clinical action is reachable without an authenticated session (fixes v1 where `usuarios` existed but was unused).

## Requirements

### Requirement: Login with hashed password [FR M1.1, N2.1, N1.1]

The system MUST authenticate users with username + password verified against a bcrypt hash stored locally. Plaintext or reversible password storage is prohibited. Login MUST work fully offline.

#### Scenario: Correct credentials unlock the workspace

- GIVEN a user exists with a bcrypt-hashed password
- WHEN the user submits correct credentials
- THEN a session is created and the workspace unlocks

#### Scenario: Wrong password is rejected

- GIVEN a user submits an incorrect password
- WHEN login is attempted
- THEN authentication fails with a plain-Spanish error and no session is created

### Requirement: Role matrix and IPC guards [FR M1.2, N2.3]

The system MUST enforce four roles — admin, bioanalista, tecnico, recepcion — with a permission matrix. Every IPC handler MUST check the caller's role in the main process before executing.

#### Scenario: Unauthorized role is blocked

- GIVEN a recepcion user is authenticated
- WHEN the user invokes a result-validation handler (bioanalista/admin only)
- THEN the handler rejects the call with a permission error and the action is audited

### Requirement: Session lifetime and idle lock [FR M1.3, N2.5]

The system MUST persist the session for the app lifetime and MUST auto-lock to a lock-screen after a configurable idle timeout. Context isolation and sandbox MUST be ON; `webSecurity:false` and `nodeIntegration` are prohibited.

#### Scenario: Idle timeout locks the screen

- GIVEN a user is logged in and idle beyond the timeout
- WHEN the idle threshold is reached
- THEN the lock-screen appears and re-authentication is required to resume

### Requirement: User management CRUD (admin only) [FR M1.4]

The system MUST allow an admin to create, disable, and reset users. Non-admin roles MUST NOT reach user-management handlers.

#### Scenario: Admin creates a tecnico user

- GIVEN an admin is authenticated
- WHEN the admin creates a new tecnico user
- THEN the user is stored with a bcrypt hash and appears in the user list

#### Scenario: Non-admin cannot manage users

- GIVEN a tecnico is authenticated
- WHEN the tecnico attempts user creation
- THEN the action is rejected and audited

### Requirement: Change own password [FR M1.5] (Should — v2.0 if capacity allows)

The system SHOULD allow any authenticated user to change their own password after verifying the current one.

#### Scenario: User changes own password

- GIVEN a user is authenticated
- WHEN the user submits a new password with the correct current password
- THEN the password hash is updated and the change is audited

### Requirement: Login throttling [FR M1.6] (Should — v2.0 if capacity allows)

The system SHOULD throttle repeated failed logins locally (offline) to slow brute-force attempts.

#### Scenario: Repeated failures are throttled

- GIVEN five consecutive failed logins for the same user
- WHEN a sixth attempt is made within the throttle window
- THEN the attempt is rejected with a wait message
