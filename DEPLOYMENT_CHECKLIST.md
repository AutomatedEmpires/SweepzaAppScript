# SweepzaAppScript v2.4 - Deployment Checklist

## ✅ Pre-Deployment Validation Complete

### Data Quality
- ✓ 152 rows in Freebie_Guy CSV
- ✓ Zero missing entry_links
- ✓ Zero invalid URLs
- ✓ Zero duplicates
- ✓ All Excel date serials parse correctly (46010-46022 = Dec 19-31, 2025)

### Code Validation
- ✓ Date parsing handles Excel serials correctly
- ✓ URL normalization working (removes www, trailing slashes, UTM params)
- ✓ Deduplication logic tested
- ✓ Expiration logic tested (26 expired, 126 active with grace=1 day)
- ✓ Tag computation working

### Safety Fixes Applied
- ✓ Master rewrite error handling (prevents data loss)
- ✓ Continuation trigger cleanup on errors (prevents infinite loops)

---

## 📋 Deployment Steps

### 1. Apps Script Setup

1. Open Google Apps Script: https://script.google.com
2. Create new project: "SweepzaAppScript"
3. Copy entire contents of `SweepzaAppScript.txt` into `Code.gs`
4. Save

### 2. Configure Script Properties

Go to Project Settings → Script Properties, add:

```
Key: OPENAI_API_KEY
Value: sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

### 3. Update Spreadsheet ID

In `Code.gs`, line ~22:

```javascript
SPREADSHEET_ID: "YOUR_ACTUAL_SPREADSHEET_ID_HERE"
```

Get ID from spreadsheet URL:
```
https://docs.google.com/spreadsheets/d/[THIS_IS_YOUR_ID]/edit
```

### 4. Run Setup

1. In Apps Script editor, select function: `sweepzaSetup`
2. Click Run
3. Authorize when prompted
4. Check execution log for success

**Expected result**:
- Creates/repairs: Control, Adjust, Source Map, Logs, Run History, Delete Audit, Master Export
- Inventories Freebie_Guy into Source Map
- Sets enabled=FALSE (operator must enable manually)

### 5. Enable Source Sheet

1. Open your spreadsheet
2. Go to `Sweepza_Source_Map` sheet
3. Find row with `sheet_name = Freebie_Guy`
4. Set `enabled = TRUE`

### 6. Configure Adjust Settings (Optional)

In `Sweepza_Master_Adjust` sheet, review/modify:

**Critical settings**:
- `llm.maxLlmRowsPerRun`: Default 500 (reduce for testing)
- `ops.autoEnableFreebieGuyIfNone`: TRUE (auto-enables if nothing else)
- `ops.validateLlmBeforeExport`: TRUE (recommended)
- `triggers.timeTriggerEnabled`: TRUE for automation

### 7. First Pipeline Run

1. Select function: `sweepzaPipeline`
2. Click Run
3. Monitor execution log

**Expected first run**:
- Normalized: 152 rows
- Deduped: 0
- Expired dropped: 26 (if DELETE_EXPIRED=TRUE in Control)
- LLM processed: Up to 500
- Exported: Depends on LLM success

### 8. Verify Results

Check these sheets:
- **Sweepza_Logs**: Stage-by-stage execution details
- **Sweepza_Run_History**: Summary stats
- **Sweepza_Delete_Audit**: All removed rows with reasons
- **Master_Export_Sheet**: Final Wix-ready output

---

## ⚙️ Control Panel Settings

In `Sweepza_Control` sheet (Cell B2-B4):

| Setting | Default | Description |
|---------|---------|-------------|
| DELETE_EXPIRED | FALSE | If TRUE, removes expired sweepstakes |
| ENABLE_MASTER_QA | TRUE | LLM quality check on Master rows |
| DRY_RUN | FALSE | If TRUE, simulates without writes |

---

## 🚨 Troubleshooting

### "Missing OPENAI_API_KEY"
→ Set in Script Properties (Step 2)

### "No enabled source sheets"
→ Set `enabled=TRUE` in Source Map for Freebie_Guy (Step 5)

### "Master headers mismatch"
→ Run `sweepzaSetup()` again to realign

### LLM errors
→ Check API key, quota limits, model name in Adjust

### Dates appear wrong
→ Excel serials are correct; Apps Script timezone matters (set to America/Los_Angeles)

---

## 📊 Expected First Run Metrics

With 152 rows, DELETE_EXPIRED=FALSE, maxLlmRowsPerRun=500:

- **Normalized**: 152
- **Deduped**: 0 (data is clean)
- **Invalid URL dropped**: 0
- **Expired dropped**: 0 (unless DELETE_EXPIRED=TRUE, then ~26)
- **LLM processed**: 152 (all rows need enrichment on first run)
- **LLM errors**: 0-5 (retry logic handles transient failures)
- **Exported**: 147-152 (depends on LLM validation success)

**Runtime**: ~3-5 minutes (depends on OpenAI API latency)

---

## 🔄 Ongoing Operations

### Automatic Runs
Triggers run every 24 hours (configurable in Adjust)

### Adding New Sources
1. Import new Octoparse CSV as new sheet
2. Run `sweepzaSetup()` to refresh Source Map
3. Set `enabled=TRUE` for new sheet in Source Map

### Monitoring
Check Sweepza_Logs regularly for errors

---

## ✅ Post-Deployment Validation

Run this query in Sweepza_Logs:

```
=COUNTIF(E:E, "ERROR")
```

Should be 0 after successful first run.

---

**Status**: Ready for deployment
**Last validated**: 2025-12-18
