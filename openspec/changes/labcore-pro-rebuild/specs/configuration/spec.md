# Configuration Specification

## Purpose

Lab, bioanalist, BCV, and print configuration with the 856-line v1 god component split into focused sub-screens, and the broken merge "Sobrescribir" path fixed.

## Requirements

### Requirement: Lab configuration [FR M13.1]

The system MUST store lab config: name, address, sede info, logo (bundled asset, not a filesystem path), and bioanalist name/title/credentials (MSDS/CBZ).

#### Scenario: Logo is stored as a bundled asset

- GIVEN an admin opens the lab config screen
- WHEN the admin sets the lab name and uploads a logo asset
- THEN the config is persisted and the logo is stored as a bundled asset usable by the PDF engine

### Requirement: BCV rate entry and history [FR M13.2, D5]

The system MUST allow manual entry of the BCV exchange rate and MUST keep a history of rate changes with last-updated timestamps.

#### Scenario: New rate is active and history is kept

- GIVEN an admin enters a new BCV rate
- WHEN the rate is saved
- THEN the new rate is active, the previous rate is retained in history, and the last-updated date is updated

### Requirement: Split settings screens [FR M13.3]

The system MUST split the v1 856-line SettingsModule into focused sub-screens: lab, bioanalist, billing, users, and backup.

#### Scenario: Each domain has its own screen

- GIVEN the settings area is opened
- WHEN the user navigates settings
- THEN each domain has its own focused screen, not a single god component

### Requirement: Fix merge Sobrescribir path [FR M13.5]

The system MUST fix the broken merge "Sobrescribir" path that collided on a UNIQUE constraint.

#### Scenario: Sobrescribir overwrites without constraint error

- GIVEN an import has a patient whose cédula exists locally
- WHEN the user chooses Sobrescribir
- THEN the local record is overwritten without a UNIQUE constraint error

### Requirement: Print defaults [FR M13.4] (Should — v2.0 if capacity allows)

The system SHOULD store print defaults: page size, margins, and copies.

#### Scenario: Default copies are applied

- GIVEN an admin sets default copies to 2
- WHEN a report is printed
- THEN the print dialog defaults to 2 copies
