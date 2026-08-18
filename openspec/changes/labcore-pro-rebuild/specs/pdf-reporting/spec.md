# PDF Reporting Specification

## Purpose

Generic multi-exam A4 PDF report with pagination, config-driven header/logo/credentials (no hardcoded machine paths), print-to-printer + preview, and print audit. ONLY validated results appear (D8); the PDF carries the validating bioanalist's signature block.

## Requirements

### Requirement: Generic multi-exam report [FR M8.1]

The system MUST generate one PDF containing multiple exams grouped together (v1 produced single-exam PDFs only).

#### Scenario: One PDF groups multiple exams

- GIVEN an order with three validated exams
- WHEN the report is generated
- THEN a single PDF contains all three exams grouped by exam

### Requirement: Pagination [FR M8.2, N11.2]

The system MUST paginate long results on A4 with consistent margins and no content cut off.

#### Scenario: Long report paginates cleanly

- GIVEN a report spans more than one A4 page
- WHEN the PDF is generated
- THEN content flows across pages with page breaks between exams and nothing is cut off

### Requirement: Config-driven header and credentials [FR M8.3, N11.3]

The system MUST pull logo, lab header, bioanalist name/credentials (MSDS/CBZ) from config. The logo MUST render from a bundled asset (base64), never a machine filesystem path. No hardcoded credentials.

#### Scenario: Logo renders on a clean machine

- GIVEN a clean machine with no lab-specific paths
- WHEN a report is generated
- THEN the logo renders from the bundled asset and credentials come from config

### Requirement: Patient header [FR M8.4]

The system MUST render the patient header: name, cédula, sex, exact age, and date.

#### Scenario: Exact age is shown in the header

- GIVEN a validated order for a female patient age 2 months
- WHEN the report is generated
- THEN the header shows the patient's exact age as 2 months

### Requirement: Results table with flags [FR M8.5]

The system MUST render a results table: análisis, resultado, unidad, referencia, and out-of-range flag.

#### Scenario: Flagged row shows the flag

- GIVEN a validated result flagged high
- WHEN the report is generated
- THEN the row shows the flag and the correct reference band

### Requirement: Print to printer and preview [FR M8.6, N11.1, N11.4]

The system MUST support print-to-OS-printer (not only save-to-file) and a WYSIWYG on-screen preview. Fonts MUST load deterministically via a `did-finish-load` + `document.fonts.ready` handshake (no fixed timeout).

#### Scenario: Print output matches the preview

- GIVEN a report preview is open
- WHEN the user clicks print
- THEN the OS print dialog targets the lab printer and the printed output matches the preview

### Requirement: Print audit [FR M8.8]

The system MUST audit every print action with actor and timestamp.

#### Scenario: Print is audited

- GIVEN a bioanalist prints a validated report
- WHEN the print completes
- THEN an audit entry records who printed and when

### Requirement: Validated-only and signature block [D8]

The system MUST NOT include non-validated results in a deliverable PDF and MUST render the validating bioanalist's signature block.

#### Scenario: Only validated results appear with signature

- GIVEN an order has one Validado and one Capturado result
- WHEN the report is generated
- THEN only the validated result appears and the validating bioanalist's signature block is printed

### Requirement: COPIA watermark [FR M8.7] (Should — v2.0 if capacity allows)

The system SHOULD produce a report copy with a "COPIA" watermark.

#### Scenario: Copy is watermarked

- GIVEN a report was already printed once
- WHEN a copy is requested
- THEN the PDF is generated with a COPIA watermark
