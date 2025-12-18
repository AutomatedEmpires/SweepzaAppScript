# SweepzaAppScript v2.4

**Production-ready sweepstakes data pipeline for Google Apps Script**

Automates the complete workflow from Octoparse CSV imports to Wix-ready CMS exports, with LLM enrichment, validation gates, and comprehensive observability.

---

## 🎯 What It Does

1. **Ingests** Octoparse-scraped sweepstakes data (CSV imports to Google Sheets)
2. **Normalizes** URLs, dates, images (handles Excel serials, protocol variations, tracking params)
3. **Deduplicates** by entry_link (keeps best by extracted_date)
4. **Enriches** with OpenAI (generates SEO-friendly descriptions, image alt text)
5. **Validates** LLM outputs (minimum lengths, prohibited claims, content gates)
6. **Tags** dynamically (Ends Today, Ends Soon, New, Daily Entry, Instant Win, etc.)
7. **Exports** to Master sheet (Wix CMS-ready format)
8. **Audits** all deletions (full traceability)
9. **Self-heals** (auto-creates missing sheets, repairs schema mismatches)

---

## ✅ Validation Status

**Tested against**: 152-row Freebie_Guy CSV (Dec 2025 data)

- ✓ Zero duplicates
- ✓ Zero invalid URLs
- ✓ All Excel date serials parse correctly (46010-46022)
- ✓ URL normalization working (removes www, trailing slashes, UTM params)
- ✓ Tag computation validated
- ✓ Expiration logic verified (26 expired, 126 active with 1-day grace)

**Code safety**:
- ✓ Master rewrite has error handling (prevents data loss)
- ✓ Continuation triggers cleaned up on errors (prevents infinite loops)
- ✓ All stages have buffered logging and audit trails

---

## 🚀 Quick Start

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for complete step-by-step instructions.

**TL;DR**:
1. Copy [SweepzaAppScript.txt](SweepzaAppScript.txt) to Apps Script
2. Set `OPENAI_API_KEY` in Script Properties
3. Update `SPREADSHEET_ID` in code
4. Run `sweepzaSetup()` once
5. Enable Freebie_Guy in Source Map
6. Run `sweepzaPipeline()`

---

## 📁 Repository Contents

| File | Purpose |
|------|---------|
| `SweepzaAppScript.txt` | Complete Apps Script codebase (2073 lines) |
| `Master_Sweeps_Doc - Freebie_Guy (1).csv` | Real CSV dataset (152 rows) |
| `DEPLOYMENT_CHECKLIST.md` | Step-by-step deployment guide |
| `test_validation.js` | Node.js test suite for core functions |

---

## 🏗️ Architecture

### Public API (Only 2 Functions)
- `sweepzaSetup()` - Idempotent infrastructure setup
- `sweepzaPipeline()` - Main execution (5 stages)

### System Sheets
- **Control**: Operator settings (DELETE_EXPIRED, ENABLE_MASTER_QA, DRY_RUN)
- **Adjust**: Schema, prompts, limits, tag precedence (edit this, not code)
- **Source Map**: Inventory of source sheets with enable flags
- **Logs**: Stage-by-stage execution details
- **Run History**: Per-run metrics and timing
- **Delete Audit**: Full record of all removed rows with reasons
- **Master Export**: Final Wix-ready output

### Pipeline Stages

1. **Normalize + Dedupe + Expire**: Clean URLs, parse dates, remove duplicates/expired
2. **LLM Enrich**: Generate descriptions and alt text (bounded by runtime/row caps)
3. **LLM Validation**: Reject outputs failing minimum standards
4. **Export to Master**: Append enriched rows, mark exported
5. **Master Hygiene**: Dedupe and expire master sheet
6. **Master QA** (optional): LLM quality check on final output

---

## 🔧 Configuration

All operator controls are in **Sweepza_Master_Adjust** sheet (no code changes needed):

### Key Settings
- `llm.maxLlmRowsPerRun`: Default 500 (prevents timeout)
- `llm.model`: gpt-4o-mini (or gpt-4o for higher quality)
- `wix.maxTags`: 3 (Wix CMS limit)
- `tag.endsSoonMinDays / maxDays`: 1-5 day window
- `ops.validateLlmBeforeExport`: TRUE (recommended safety gate)
- `ops.exportRequiresEndDate`: TRUE (skip rows missing end dates)

### Tag Precedence
Defined in Adjust sheet, top-to-bottom priority:
1. Ends Today
2. Ends Soon
3. New
4. Instant Win
5. Social Media
6. Daily Entry
7. Single Entry

---

## 📊 Data Flow

```
Octoparse CSV → Google Sheets (Freebie_Guy)
                      ↓
         Stage 1: Normalize/Dedupe/Expire
                      ↓
         Stage 2: LLM Enrich (OpenAI)
                      ↓
         Stage 2b: Validation Gate
                      ↓
         Stage 3: Export to Master
                      ↓
         Stage 4: Master Hygiene
                      ↓
         Stage 5: Master QA (optional)
                      ↓
              Master Export Sheet
                      ↓
                Wix CMS Import
```

---

## 🛡️ Safety Features

1. **Locking**: Script lock prevents concurrent runs
2. **Runtime caps**: Max 5.7 minutes per execution
3. **LLM caps**: Default 500 rows/run, continuation triggers for backlog
4. **Buffered I/O**: Logs and audits batched to minimize API calls
5. **Error boundaries**: Master rewrite wrapped in try-catch
6. **Dry run mode**: Test changes without writes
7. **Audit trail**: Every deletion logged with reason, entry_link, dates

---

## 🔍 Observability

### Sweepza_Logs
Per-row execution details:
```
Timestamp | RunId | Level | Source | Row | Message
```

### Sweepza_Run_History
Per-run metrics:
```
normalized | deduped | invalidUrlDropped | expiredDropped
llmProcessed | llmErrors | llmRejected | exported | masterDropped
durationMs | error
```

### Sweepza_Delete_Audit
Full deletion record:
```
Timestamp | RunId | Sheet | Row | Reason | Entry_Link | End_Date_Raw | End_Date_Norm | End_Date_Epoch | Notes
```

---

## 🧪 Testing

Run validation suite:
```bash
node test_validation.js
```

Tests:
- Excel date serial parsing (46010-46022)
- URL normalization (www removal, protocol upgrade, tracking param stripping)
- CSV data quality (missing fields, invalid URLs, duplicates)
- Tag computation logic

---

## 🚨 Troubleshooting

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) troubleshooting section.

Common issues:
- **Missing API key**: Set `OPENAI_API_KEY` in Script Properties
- **No enabled sheets**: Set `enabled=TRUE` in Source Map
- **Header mismatch**: Run `sweepzaSetup()` to realign
- **Date issues**: Ensure spreadsheet timezone = America/Los_Angeles

---

## 📈 Performance

**First run** (152 rows, all need LLM):
- Runtime: ~3-5 minutes
- LLM calls: 152 (batched efficiently)
- Writes: Buffered for maximum throughput

**Incremental runs** (after initial processing):
- Runtime: <1 minute (only new/changed rows)
- Continuation triggers handle large backlogs

---

## 🔄 Updates

**v2.4** (2025-12-18):
- Added Master rewrite error handling
- Added continuation trigger cleanup on errors
- Improved rules_url defaulting logic
- Full validation test suite
- Deployment checklist

**v2.3**:
- LLM validation gates
- Buffered logging/audits
- Source Map auto-inventory
- Self-repair capabilities

---

## 📄 License

Proprietary - AutomatedEmpires

---

## 🤝 Support

For issues or questions, check:
1. [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
2. Sweepza_Logs sheet in your spreadsheet
3. Run History for execution metrics

---

**Status**: ✅ Production-ready | Validated 2025-12-18