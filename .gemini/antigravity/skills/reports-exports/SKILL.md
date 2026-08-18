---
name: reports-exports
description: Patterns for generating and exporting reports in [APP] — PDF receipts, CSV revenue reports, booking summaries, and barber performance metrics. Covers PDF generation (PDFKit/puppeteer), CSV streaming for large datasets, and scheduled report delivery. Use when implementing admin dashboard reports, financial exports, or PDF booking confirmations.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+."
metadata:
  trigger: ["reporte", "pdf export", "csv export", "ingresos report", "financial report", "booking summary", "barber performance", "pdf receipt", "export data", "report generation"]
  scope: [global, project]
  version: "1.0.0"
allowed-tools: Bash(node:*) Read
---

# 📊 Reports & Exports

Generate and export reports: PDF receipts, CSV revenue reports, booking summaries, barber performance metrics.

## 📋 When to Use

- Use when implementing admin dashboard reports (revenue, bookings, ratings)
- Use when generating PDF booking confirmations or receipts
- Use when exporting data to CSV for accounting
- Do NOT use for real-time dashboard stats (use API + charts)

## 🚦 Hard Rules

- **Always** stream large CSV exports (don't load all rows in memory)
- **Always** sanitize data before export (no PII in CSV unless encrypted)
- **Always** generate PDFs in a background job for large reports
- **Never** block the request thread for > 5 seconds on report generation

## 🛠️ Workflow

1. Read report types: [report-types.md](references/report-types.md)
2. Read generation patterns: [generation-patterns.md](references/generation-patterns.md)
3. Run the checker to verify report endpoints are async:
   ```bash
   node ./.opencode/skills/reports-exports/scripts/check-reports.mjs
   ```

## 📚 References

- [Report Types](references/report-types.md) — PDF receipt, CSV revenue, barber metrics
- [Generation Patterns](references/generation-patterns.md) — PDFKit, CSV stream, background job
- [`prisma-orm`](../prisma-orm/SKILL.md) — aggregate queries
- [`postgresql`](../postgresql/SKILL.md) — indexing for report queries
- [`payments`](../payments/SKILL.md) — revenue data source
- [`booking-scheduling-domain`](../booking-scheduling-domain/SKILL.md) — booking data source
- [`background-jobs-queues`](../background-jobs-queues/SKILL.md) — async generation
