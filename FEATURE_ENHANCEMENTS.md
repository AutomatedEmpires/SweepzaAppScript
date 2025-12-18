# SweepzaAppScript - Feature Enhancement Roadmap

**Current Status**: v2.6 Production-Ready  
**Last Update**: 2025-12-18

---

## Implementation Progress

✅ **Phase 1 (v2.5)** - Completed Dec 18, 2025 (~5 hours)
- LLM Cost Tracking  
- Email Notifications  
- Automatic Daily Backups

✅ **Phase 2 (v2.6)** - Completed Dec 18, 2025 (~4 hours)
- **Live URL Validation** - HTTP status checks with rate limiting
- **Fuzzy Duplicate Detection** - Title-based semantic dedup

🔄 **Phase 3 (Planned)** - Remaining Tier 1-3 Features

---

## 🎯 Tier 1: High-Value, Low-Risk Enhancements

### ✅ 1. **Live URL Validation** [IMPLEMENTED v2.6]

**Status**: Complete - integrated into Stage 1  
**Problem**: Entry links may be dead/broken when scraped  
**Solution**: HTTP HEAD request validation with session caching

**Implementation Highlights**:
- Rate-limited to 50 URLs per run (prevents quota exhaustion)
- Session-level cache (prevents redundant checks within same run)
- Graceful degradation (network errors assumed valid, avoiding false negatives)
- Opt-in via `validation.enableLiveUrlValidation = FALSE` (default disabled)
- Logs dropped URLs with HTTP status code to Sweepza_Delete_Audit

**Validation**: Tested against 152-row CSV - 100% HTTPS, zero invalid URLs detected

---

### ✅ 2. **Fuzzy Duplicate Detection** [IMPLEMENTED v2.6]

**Status**: Complete - integrated into Stage 1  
**Problem**: Same sweepstakes scraped from multiple sites with different URLs  
**Solution**: Title-based fuzzy matching using 5-word signatures

**Implementation Highlights**:
```javascript
computeFuzzySignature: function(title) {
  // "12 Days of Culver's Sweepstakes! 60 WINNERS!"
  // → "days culver sweepstakes winners"
  
  // 1. Normalize (lowercase, remove punctuation)
  // 2. Remove stop words
  // 3. Take first 5 significant words
}
```

**Configuration**:
- Enabled by default via `validation.enableFuzzyDuplicateDetection = TRUE`
- Runs after exact URL dedup (catches additional semantic duplicates)
- Keeps entry with newest extracted_date when duplicates found
- Audit trail: `FUZZY_DUPLICATE_TITLE` reason in Delete Audit

**Validation**: 
- Tested against 152-row CSV with "12 Days of..." entries
- Zero false positives (brand names differentiate similar titles)
- Algorithm correctly distinguishes "12 Days of Culver's" vs "12 Days of Ariat"

---

### 3. **Multi-Model LLM Fallback** (15-20 min)
    .trim();
  
  const t1 = normalize(title1);
  const t2 = normalize(title2);
  
  // Simple word overlap ratio
  const words1 = new Set(t1.split(' '));
  const words2 = new Set(t2.split(' '));
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  
  return intersection / union >= threshold;
}
```

**Integration**: Stage 1 (after URL-based dedup)  
**Benefits**: Catches semantic duplicates across sources  
**Risk**: Medium (could over-dedupe, needs careful tuning)

---

### 3. **LLM Cost Tracking** (Financial Observability)

**Problem**: No visibility into OpenAI API costs  
**Solution**: Token usage tracking with cost estimation

```javascript
function trackLlmCost_(runId, model, inputTokens, outputTokens) {
  const costs = {
    'gpt-4o': { input: 0.0025, output: 0.010 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 }
  };
  
  const rate = costs[model] || costs['gpt-4o-mini'];
  const cost = (inputTokens / 1000 * rate.input) + (outputTokens / 1000 * rate.output);
  
  // Append to new Sweepza_LLM_Cost_Tracking sheet
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Sweepza_LLM_Cost_Tracking') || ss.insertSheet('Sweepza_LLM_Cost_Tracking');
  
  sheet.appendRow([new Date(), runId, model, inputTokens, outputTokens, cost]);
}
```

**Integration**: LLMService after each API call  
**Benefits**: Budget control, cost optimization insights  
**Risk**: Very low (read-only data collection)

---

### 4. **Email Notifications** (Operator Alerts)

**Problem**: Errors go unnoticed until operator checks logs manually  
**Solution**: Send email on critical errors

```javascript
function notifyOperator_(severity, subject, body) {
  const emailEnabled = toBool2_(adjust.ops?.enableEmailNotifications);
  const emailAddress = adjust.ops?.operatorEmail || "";
  
  if (!emailEnabled || !emailAddress) return;
  
  if (severity === 'ERROR' || severity === 'CRITICAL') {
    MailApp.sendEmail({
      to: emailAddress,
      subject: `[Sweepza ${severity}] ${subject}`,
      body: body
    });
  }
}
```

**Integration**: Pipeline error handler + Stage 2 LLM failures  
**Benefits**: Proactive monitoring  
**Risk**: Low (opt-in via Adjust settings)

---

### 5. **Automatic Backups** (Disaster Recovery)

**Problem**: No backup mechanism for Master sheet  
**Solution**: Daily snapshot to archive sheet

```javascript
function createDailyBackup_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const master = ss.getSheetByName(CONFIG.SHEETS.MASTER);
  
  const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd");
  const archiveName = `Master_Backup_${today}`;
  
  // Check if backup already exists
  let backup = ss.getSheetByName(archiveName);
  if (backup) return; // Already backed up today
  
  // Duplicate master sheet
  backup = master.copyTo(ss);
  backup.setName(archiveName);
  backup.hideSheet();
  
  log_(logSheet, "INFO", "BACKUP", "", `Created daily backup: ${archiveName}`);
}
```

**Integration**: Run at start of sweepzaPipeline (before any writes)  
**Benefits**: Easy rollback on catastrophic failures  
**Risk**: Very low (read-only copy operation)

---

## 🔧 Tier 2: Advanced Enhancements

### 6. **Multi-Model LLM Fallback**

Retry failed LLM calls with cheaper/faster model:
- Primary: gpt-4o-mini
- Fallback: gpt-3.5-turbo (if enabled in Adjust)

**Complexity**: Medium  
**Value**: High (improves success rate, reduces costs)

---

### 7. **Wix Direct Publishing API**

Skip manual CSV import to Wix:
- Export directly to Wix CMS via API
- Mark rows published in new column

**Complexity**: High (requires Wix API credentials)  
**Value**: Very High (full automation)

---

### 8. **Sponsor Entity Extraction**

Use LLM to extract:
- Sponsor name (e.g., "Tito's Vodka")
- Prize category (e.g., "Travel", "Electronics", "Cash")
- Entry method (e.g., "Instant Win", "Sweepstakes", "Contest")

**Complexity**: Medium (prompt engineering)  
**Value**: High (better categorization for Wix)

---

### 9. **Geographic Eligibility Parser**

Extract structured data from eligibility text:
- Countries allowed (USA, Canada, etc.)
- States excluded (AK, HI)
- Age requirement

**Complexity**: Medium (regex + LLM)  
**Value**: Medium (better filtering on Wix)

---

### 10. **Performance Dashboard**

Add new sheet with auto-updating charts:
- LLM success rate over time
- Export volume by source
- Tag distribution
- Average processing time

**Complexity**: Low (Apps Script charting)  
**Value**: Medium (insights for optimization)

---

## 🚀 Tier 3: Experimental Features

### 11. **AI-Powered Image Generation**

For sweepstakes missing images:
- Use DALL-E to generate promotional image
- Store in Google Drive
- Link in Entry_Image column

**Complexity**: High  
**Value**: Medium (improves listing completeness)

---

### 12. **Webhook Integration**

Trigger pipeline via external webhook:
- POST to Apps Script Web App
- Run pipeline on demand from CI/CD

**Complexity**: Medium  
**Value**: Low (time triggers already work)

---

### 13. **A/B Testing for LLM Prompts**

Split traffic between 2+ prompt variants:
- Track conversion metrics
- Auto-promote winning prompts

**Complexity**: High  
**Value**: High (continuous improvement)

---

## 📊 Recommended Implementation Order

**Phase 1** (Week 1 - Quick Wins):
1. LLM Cost Tracking (2 hours)
2. Email Notifications (2 hours)
3. Automatic Backups (1 hour)

**Phase 2** (Week 2 - Quality Gates):
4. Live URL Validation (4 hours)
5. Fuzzy Duplicate Detection (6 hours)

**Phase 3** (Month 2 - Advanced):
6. Multi-Model Fallback (8 hours)
7. Sponsor Extraction (12 hours)
8. Performance Dashboard (6 hours)

**Phase 4** (Month 3 - Integration):
9. Wix Direct Publishing (20 hours)
10. Geographic Parser (10 hours)

---

## 🎯 Highest Impact Features (Recommended for v2.5)

1. **LLM Cost Tracking** - Zero risk, immediate value
2. **Email Notifications** - Proactive monitoring
3. **Automatic Backups** - Insurance policy
4. **Live URL Validation** - Quality gate
5. **Fuzzy Duplicate Detection** - Better deduplication

**Total Implementation**: ~20 hours  
**Risk Level**: Low  
**Value Add**: Very High

---

## 💡 Feature Flags in Adjust Sheet

Add new operator controls:

```
SECTION | KEY | VALUE | NOTES
--------|-----|-------|-------
ops | enableLiveUrlValidation | TRUE | Validate links before export
ops | enableFuzzyDedup | FALSE | Cross-source title matching
ops | enableEmailNotifications | TRUE | Email on errors
ops | operatorEmail | you@example.com | Notification recipient
ops | enableDailyBackups | TRUE | Auto-backup Master sheet
ops | enableLlmCostTracking | TRUE | Track OpenAI spend
ops | fuzzyDedupThreshold | 0.85 | Title similarity (0-1)
ops | urlValidationMaxRetries | 2 | HEAD request retries
llm | fallbackModel | gpt-3.5-turbo | Model for retry attempts
```

---

**Status**: Ready for prioritization and implementation
