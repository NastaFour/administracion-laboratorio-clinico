# Payments & Cierre de Caja Specification

## Purpose

Venezuelan payment model: pay-before-delivery as the norm plus credit accounts with partial payments (abonos). Dual currency Bs/USD with a manually-entered offline BCV rate. Delivery is blocked on a pending balance except for authorized credit (D5). Daily cierre de caja consolidates deposit and delivery moments.

## Requirements

### Requirement: Payment methods [FR M9.1]

The system MUST support pago móvil, transferencia, punto, efectivo, and mixed methods.

#### Scenario: Method is recorded

- GIVEN a reception user is recording a payment
- WHEN the user selects pago móvil
- THEN the method is stored on the payment record

### Requirement: Dual currency with offline BCV rate [FR M9.2, D5, N1.3, N9.2]

The system MUST record amounts in Bs and/or USD using a manually-entered BCV exchange rate and MUST surface the rate's last-updated date.

#### Scenario: USD payment converts to Bs

- GIVEN the BCV rate is set to 1 USD = 950 Bs (last updated 2026-08-18)
- WHEN a 10 USD payment is recorded
- THEN the Bs equivalent (9500) is stored and the last-updated date is shown

#### Scenario: Missing rate blocks USD payment

- GIVEN no BCV rate has ever been entered
- WHEN the user attempts to record a USD payment
- THEN the system blocks the action and prompts for the rate first

### Requirement: Payment reference, date, cashier [FR M9.3]

The system MUST store the payment reference number, date, and the cashier (usuario) who recorded it.

#### Scenario: Reference and cashier are persisted

- GIVEN a pago móvil payment is recorded
- WHEN the payment is saved
- THEN the reference number, date, and cashier id are persisted

### Requirement: Partial payments and balance [FR M9.4, D5]

The system MUST support partial payments (abonos) and MUST track the remaining balance due.

#### Scenario: Balance is tracked after an abono

- GIVEN an order total of 1000 Bs with a 400 Bs abono
- WHEN the balance is computed
- THEN 600 Bs remains due

### Requirement: Delivery block on pending balance [FR M9.7, D5]

The system MUST block order delivery (Entregada) while a balance is pending, except for authorized credit accounts. Credit accounts are for special/recurrent cases only.

#### Scenario: Delivery blocked on unpaid balance

- GIVEN an order has a 600 Bs unpaid balance and is not on credit
- WHEN the user attempts to mark it Entregada
- THEN delivery is blocked with a plain-Spanish message

#### Scenario: Authorized credit allows delivery

- GIVEN an order is an authorized credit account
- WHEN the user marks it Entregada despite an open balance
- THEN delivery is allowed and the credit balance is recorded

### Requirement: Daily cierre de caja [FR M9.5, D5]

The system MUST produce a daily cierre de caja consolidating both the deposit moment and the delivery moment, summarizing by method with Bs and USD totals, and MUST be printable. The BCV rate last-updated date MUST appear on the close.

#### Scenario: Cierre consolidates both moments

- GIVEN several payments were recorded across a day
- WHEN the cashier runs the cierre de caja
- THEN a consolidated summary by method (Bs + USD totals) is generated and printable, with the rate last-updated date

### Requirement: Payment audit [FR M9.6]

The system MUST audit every payment and every cancellation/refund.

#### Scenario: Cancellation is audited

- GIVEN a payment is cancelled
- WHEN the cancellation is applied
- THEN an audit entry records the actor, the payment, and the cancellation
