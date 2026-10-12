---
id: billing-invoice-export-pdf
type: knowledge
scope: workspace
tags: [billing, invoice, export, pdf, report]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
---

# Knowledge: Billing Invoice Export Pdf

## Context

Finance asked for monthly invoice exports in a printable format.

## Content

- Invoice export renders PDF through the `InvoicePdfRenderer` using the shared A4 template.
- Amounts use the invoice currency with two decimals and the customer locale for separators.
- Exports above 500 invoices run as a background job and are delivered through a download link.

## Example

Use this memory when changing invoice exports or PDF templates.
