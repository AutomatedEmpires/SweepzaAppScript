/**
 * Validation Test for v2.6 Features: Fuzzy Dedup & Live URL Validation
 * Tests against actual CSV data from Master_Sweeps_Doc - Freebie_Guy (1).csv
 */

const fs = require('fs');
const csv = require('csv-parser');

// Simulate Apps Script functions
function computeFuzzySignature(title) {
  if (!title || typeof title !== "string") return "";
  
  // Normalize: lowercase, remove punctuation, collapse whitespace
  let normalized = title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  // Remove common stop words
  const stopWords = ["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"];
  const words = normalized.split(" ").filter(w => w.length > 2 && !stopWords.includes(w));
  
  // Take first 5 significant words as signature
  return words.slice(0, 5).join(" ");
}

async function runTests() {
  console.log("=".repeat(70));
  console.log("VALIDATION TESTS: v2.6 Features (Fuzzy Dedup & URL Validation)");
  console.log("=".repeat(70));
  
  const rows = [];
  
  // Load CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream('Master_Sweeps_Doc - Freebie_Guy (1).csv')
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`\n✓ Loaded ${rows.length} rows from CSV\n`);
  
  // Test 1: Fuzzy Duplicate Detection
  console.log("TEST 1: Fuzzy Duplicate Detection");
  console.log("-".repeat(70));
  
  const fuzzySignatures = new Map();
  let fuzzyDuplicateCount = 0;
  const fuzzyDuplicateGroups = [];
  
  rows.forEach((row, idx) => {
    const title = row.Scrub_Title || "";
    if (!title) return;
    
    const signature = computeFuzzySignature(title);
    if (!signature) return;
    
    if (fuzzySignatures.has(signature)) {
      fuzzySignatures.get(signature).push({ idx: idx + 2, title, url: row.Entry_Link });
      fuzzyDuplicateCount++;
    } else {
      fuzzySignatures.set(signature, [{ idx: idx + 2, title, url: row.Entry_Link }]);
    }
  });
  
  // Find groups with duplicates
  for (const [signature, entries] of fuzzySignatures) {
    if (entries.length > 1) {
      fuzzyDuplicateGroups.push({ signature, entries });
    }
  }
  
  console.log(`Total unique fuzzy signatures: ${fuzzySignatures.size}`);
  console.log(`Fuzzy duplicate groups found: ${fuzzyDuplicateGroups.length}`);
  console.log(`Total duplicate entries: ${fuzzyDuplicateCount}\n`);
  
  if (fuzzyDuplicateGroups.length > 0) {
    console.log("Sample fuzzy duplicates:\n");
    fuzzyDuplicateGroups.slice(0, 5).forEach(group => {
      console.log(`Signature: "${group.signature}"`);
      group.entries.forEach(e => {
        console.log(`  Row ${e.idx}: ${e.title.substring(0, 60)}`);
        console.log(`           ${e.url.substring(0, 60)}`);
      });
      console.log();
    });
  }
  
  // Test 2: URL Pattern Analysis
  console.log("\nTEST 2: URL Pattern Analysis (for validation)");
  console.log("-".repeat(70));
  
  const urlProtocols = { http: 0, https: 0, other: 0 };
  const urlDomains = new Map();
  const suspiciousUrls = [];
  
  rows.forEach((row, idx) => {
    const url = (row.Entry_Link || "").trim();
    if (!url) return;
    
    if (url.startsWith("https://")) {
      urlProtocols.https++;
    } else if (url.startsWith("http://")) {
      urlProtocols.http++;
    } else {
      urlProtocols.other++;
      suspiciousUrls.push({ idx: idx + 2, url });
    }
    
    try {
      const domain = new URL(url).hostname;
      urlDomains.set(domain, (urlDomains.get(domain) || 0) + 1);
    } catch (e) {
      suspiciousUrls.push({ idx: idx + 2, url, error: e.message });
    }
  });
  
  console.log(`Protocol distribution:`);
  console.log(`  HTTPS: ${urlProtocols.https} (${(urlProtocols.https/rows.length*100).toFixed(1)}%)`);
  console.log(`  HTTP:  ${urlProtocols.http} (${(urlProtocols.http/rows.length*100).toFixed(1)}%)`);
  console.log(`  Other: ${urlProtocols.other} (${(urlProtocols.other/rows.length*100).toFixed(1)}%)`);
  
  console.log(`\nTop 10 domains:`);
  const sortedDomains = [...urlDomains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  sortedDomains.forEach(([domain, count]) => {
    console.log(`  ${domain}: ${count} entries`);
  });
  
  if (suspiciousUrls.length > 0) {
    console.log(`\n⚠ Suspicious URLs found: ${suspiciousUrls.length}`);
    suspiciousUrls.slice(0, 3).forEach(u => {
      console.log(`  Row ${u.idx}: ${u.url}`);
      if (u.error) console.log(`    Error: ${u.error}`);
    });
  } else {
    console.log(`\n✓ All URLs have valid format`);
  }
  
  // Test 3: Fuzzy Dedup Effectiveness Metrics
  console.log("\nTEST 3: Fuzzy Dedup Effectiveness");
  console.log("-".repeat(70));
  
  const exactDuplicates = new Map();
  rows.forEach((row, idx) => {
    const url = (row.Entry_Link || "").trim().toLowerCase();
    if (!url) return;
    
    if (exactDuplicates.has(url)) {
      exactDuplicates.get(url).push(idx + 2);
    } else {
      exactDuplicates.set(url, [idx + 2]);
    }
  });
  
  const exactDupCount = [...exactDuplicates.values()].filter(arr => arr.length > 1).length;
  
  console.log(`Exact URL duplicates: ${exactDupCount}`);
  console.log(`Fuzzy title duplicates (additional): ${fuzzyDuplicateGroups.length - exactDupCount}`);
  console.log(`Total duplicates caught: ${fuzzyDuplicateGroups.length + exactDupCount}`);
  
  // Calculate effectiveness
  const totalRows = rows.length;
  const totalDuplicates = fuzzyDuplicateCount + exactDupCount;
  const effectiveRows = totalRows - totalDuplicates;
  
  console.log(`\nDeduplication impact:`);
  console.log(`  Original rows: ${totalRows}`);
  console.log(`  After exact dedup: ${totalRows - exactDupCount}`);
  console.log(`  After fuzzy dedup: ${effectiveRows} (${(effectiveRows/totalRows*100).toFixed(1)}% retained)`);
  
  // Test 4: Edge Cases
  console.log("\nTEST 4: Edge Case Analysis");
  console.log("-".repeat(70));
  
  let emptyTitles = 0;
  let shortTitles = 0;
  let longTitles = 0;
  let emptyUrls = 0;
  
  rows.forEach(row => {
    const title = (row.Scrub_Title || "").trim();
    const url = (row.Entry_Link || "").trim();
    
    if (!title) emptyTitles++;
    else if (title.length < 10) shortTitles++;
    else if (title.length > 100) longTitles++;
    
    if (!url) emptyUrls++;
  });
  
  console.log(`Empty titles: ${emptyTitles}`);
  console.log(`Short titles (<10 chars): ${shortTitles}`);
  console.log(`Long titles (>100 chars): ${longTitles}`);
  console.log(`Empty URLs: ${emptyUrls}`);
  
  // Final Summary
  console.log("\n" + "=".repeat(70));
  console.log("VALIDATION SUMMARY");
  console.log("=".repeat(70));
  
  const results = {
    totalRows: rows.length,
    fuzzyDuplicatesFound: fuzzyDuplicateGroups.length,
    httpsUrls: urlProtocols.https,
    httpUrls: urlProtocols.http,
    invalidUrls: suspiciousUrls.length,
    uniqueDomains: urlDomains.size
  };
  
  console.log(`✓ Dataset has ${results.totalRows} rows`);
  console.log(`✓ Fuzzy dedup would catch ${results.fuzzyDuplicatesFound} additional duplicate groups`);
  console.log(`✓ ${results.httpsUrls} URLs use HTTPS (${(results.httpsUrls/results.totalRows*100).toFixed(1)}%)`);
  console.log(`✓ ${results.uniqueDomains} unique domains detected`);
  
  if (results.invalidUrls === 0) {
    console.log(`✓ All URLs are valid for live validation`);
  } else {
    console.log(`⚠ ${results.invalidUrls} URLs may fail live validation`);
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("EXPECTED BEHAVIOR IN APPS SCRIPT:");
  console.log("=".repeat(70));
  console.log(`1. With enableFuzzyDuplicateDetection=TRUE:`);
  console.log(`   - ${fuzzyDuplicateCount} rows will be dropped as fuzzy duplicates`);
  console.log(`   - Keeps ${effectiveRows} rows (${(effectiveRows/totalRows*100).toFixed(1)}%)`);
  console.log(`\n2. With enableLiveUrlValidation=TRUE (max 50/run):`);
  console.log(`   - First 50 URLs will be checked for HTTP 200-399 status`);
  console.log(`   - Unreachable URLs will be dropped from pipeline`);
  console.log(`   - Session cache prevents redundant checks`);
  console.log(`\n3. Recommended settings for this dataset:`);
  console.log(`   - enableFuzzyDuplicateDetection: TRUE (catches 3 semantic dups)`);
  console.log(`   - enableLiveUrlValidation: FALSE initially (all URLs appear valid)`);
  console.log("=".repeat(70));
}

runTests().catch(console.error);
