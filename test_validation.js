/**
 * SweepzaAppScript Validation Test Suite
 * Tests critical functions against real CSV data
 */

const fs = require('fs');
const crypto = require('crypto');

// ============================================================================
// MOCK APPS SCRIPT APIS
// ============================================================================

const Utilities = {
  formatDate: function(date, timezone, format) {
    if (format === "MM/dd/yyyy") {
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    }
    if (format === "yyyy-MM-dd") {
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${yyyy}-${mm}-${dd}`;
    }
    return date.toISOString();
  },
  computeDigest: function(algo, str, charset) {
    return Buffer.from(crypto.createHash('sha256').update(str).digest());
  },
  base64Encode: function(bytes) {
    return bytes.toString('base64');
  },
  DigestAlgorithm: { SHA_256: 'sha256' },
  Charset: { UTF_8: 'utf8' }
};

const CONFIG = { TIMEZONE: "America/Los_Angeles" };

// ============================================================================
// DATE UTILS
// ============================================================================

const DateUtils = {
  toKey: function(d) {
    return Utilities.formatDate(d, CONFIG.TIMEZONE, "yyyy-MM-dd");
  },
  parseToMDY_: function(v) {
    const d = this.parse_(v);
    if (!d) return { epoch: null, mdy: "" };
    const mdy = Utilities.formatDate(d, CONFIG.TIMEZONE, "MM/dd/yyyy");
    return { epoch: d.getTime(), mdy };
  },
  parse_: function(v) {
    if (v === null || v === undefined || v === "") return null;
    if (v instanceof Date && !isNaN(v.getTime())) return v;

    let raw = v;
    if (typeof raw === "string") raw = raw.trim();
    if (typeof raw === "string" && raw === "") return null;
    if (typeof raw === "string" && /^\d+(\.\d+)?$/.test(raw)) raw = Number(raw);

    if (typeof raw === "number" && isFinite(raw)) {
      if (raw > 1000000000000) { const d = new Date(raw); return isNaN(d.getTime()) ? null : d; }
      if (raw > 1000000000) { const d = new Date(raw * 1000); return isNaN(d.getTime()) ? null : d; }
      if (raw >= 19000101 && raw <= 20991231) {
        const s = String(Math.trunc(raw));
        const d = new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
        return isNaN(d.getTime()) ? null : d;
      }
      if (raw > 20000 && raw < 80000) {
        const excelBase = new Date(Date.UTC(1899, 11, 30));
        const d = new Date(excelBase.getTime() + raw * 86400000);
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    }

    if (typeof raw === "string") {
      const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) {
        const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }
};

const DataNormalizer = {
  isHttpUrl: function(s) {
    if (!s || typeof s !== "string") return false;
    const t = s.trim().toLowerCase();
    return t.startsWith("http://") || t.startsWith("https://");
  },
  normalizeUrl: function(v) {
    if (!v || typeof v !== "string") return "";
    let s = v.trim();
    if (!s) return "";
    if (s.startsWith("//")) s = "https:" + s;
    if (s.startsWith("http://")) s = "https://" + s.slice(7);
    if (!s.toLowerCase().startsWith("https://")) return s;

    try {
      const u = new URL(s);
      u.hostname = u.hostname.toLowerCase();
      if (u.hostname.startsWith("www.")) u.hostname = u.hostname.slice(4);
      u.hash = "";
      ["utm_source","utm_medium","utm_campaign","fbclid","gclid"].forEach(k => u.searchParams.delete(k));
      if (u.pathname.length > 1 && u.pathname.endsWith("/")) u.pathname = u.pathname.slice(0, -1);
      return u.toString();
    } catch (e) {
      return s;
    }
  }
};

// ============================================================================
// TEST RUNNER
// ============================================================================

let PASS = 0, FAIL = 0;

function test(name, fn) {
  try {
    fn();
    PASS++;
    console.log(`✓ ${name}`);
  } catch (e) {
    FAIL++;
    console.log(`✗ ${name}: ${e.message}`);
  }
}

function assert(c, m) { if (!c) throw new Error(m || "Failed"); }
function assertEqual(a, e, m) { if (a !== e) throw new Error(m || `Expected ${e}, got ${a}`); }

// ============================================================================
// TESTS
// ============================================================================

console.log("\n=== DATE PARSING TESTS ===\n");

test("Excel 46015 → 12/23/2025", () => {
  const r = DateUtils.parseToMDY_(46015);
  assertEqual(r.mdy, "12/23/2025");
});

test("Excel 46010 → 12/18/2025", () => {
  assertEqual(DateUtils.parseToMDY_(46010).mdy, "12/18/2025");
});

test("String '46015' → 12/23/2025", () => {
  assertEqual(DateUtils.parseToMDY_("46015").mdy, "12/23/2025");
});

console.log("\n=== URL NORMALIZATION ===\n");

test("Remove www", () => {
  assertEqual(DataNormalizer.normalizeUrl("https://www.example.com/test/"), "https://example.com/test");
});

test("http → https", () => {
  assertEqual(DataNormalizer.normalizeUrl("http://example.com"), "https://example.com");
});

console.log("\n=== CSV DATA VALIDATION ===\n");

const csv = fs.readFileSync('Master_Sweeps_Doc - Freebie_Guy (1).csv', 'utf8');
const rows = csv.split('\n').slice(1, 6);

test("CSV rows parse dates correctly", () => {
  rows.forEach((line, i) => {
    const cols = line.split(',');
    if (cols.length > 3) {
      const endDate = cols[2].trim();
      const parsed = DateUtils.parseToMDY_(endDate);
      assert(parsed.mdy !== "", `Row ${i+1} date failed: ${endDate}`);
    }
  });
});

console.log(`\n${"=".repeat(40)}\nRESULTS: ${PASS} passed, ${FAIL} failed\n${"=".repeat(40)}\n`);
process.exit(FAIL > 0 ? 1 : 0);
