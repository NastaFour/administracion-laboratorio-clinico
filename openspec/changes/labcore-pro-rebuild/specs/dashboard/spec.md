# Dashboard Specification

## Purpose

Real-data dashboard across four views (D10): today's orders & collections; debtors with aging; lab statistics (top exams, monthly revenue vs previous); per-patient analyte trends. Fixes v1's 100% fabricated dashboard. No fabricated or fallback numbers ever.

## Requirements

### Requirement: Real KPIs from DB queries [FR M11.1, D10]

The system MUST compute all dashboard KPIs from real database queries: orders today, revenue today (Bs + USD), pending results, and exams by category.

#### Scenario: KPIs reflect today's real activity

- GIVEN three orders were created today and one is pending validation
- WHEN the user opens the dashboard
- THEN orders-today shows 3 and pending-results shows 1, sourced from real queries

### Requirement: Four dashboard views [D10]

The system MUST provide four views: (1) today's orders & collections; (2) debtors with aging; (3) lab statistics (top exams, monthly revenue vs previous month); (4) per-patient analyte trends.

#### Scenario: Debtor appears in the correct aging bucket

- GIVEN a debtor owes 2000 Bs for 45 days
- WHEN the user opens the debtors view
- THEN the debtor appears in the 31–60 day aging bucket

### Requirement: Date-range selector with real data [FR M11.3]

The system MUST provide a date-range selector and all displayed numbers MUST reflect real data within the selected range.

#### Scenario: Range selection filters real data

- GIVEN the user selects last month
- WHEN the lab-statistics view loads
- THEN revenue and top-exam counts reflect only last month's real data

### Requirement: No fabricated numbers, empty states [FR M11.4, D10]

The system MUST NEVER display fabricated or fallback numbers. When no data exists for a view, an empty state MUST be shown.

#### Scenario: Empty state when no data

- GIVEN no orders exist today
- WHEN the user opens the dashboard
- THEN an empty state is shown, not a zero or placeholder number pretending to be data

### Requirement: Dashboard charts [FR M11.2] (Should — v2.0 if capacity allows)

The system SHOULD render charts (revenue trend, exam volume, top exams) wired to real data.

#### Scenario: Revenue trend plots real data

- GIVEN twelve months of revenue data exist
- WHEN the revenue-trend chart loads
- THEN it plots real monthly revenue, not hardcoded constants
