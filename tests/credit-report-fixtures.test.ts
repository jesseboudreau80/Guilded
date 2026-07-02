import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  CreditReport,
  DEROGATORY_STATUSES,
  SYNTHETIC_DISCLAIMER,
  creditReportSchema,
} from "@/types/credit-report";

const FIXTURE_DIR = join(__dirname, "..", "fixtures", "credit-reports");

const jsonFiles = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith(".json"));

function load(file: string): CreditReport {
  return creditReportSchema.parse(JSON.parse(readFileSync(join(FIXTURE_DIR, file), "utf8")));
}

describe("credit report fixtures", () => {
  it("ships the full persona set", () => {
    expect(jsonFiles.sort()).toEqual([
      "bankruptcy-ch7.json",
      "clean-baseline.json",
      "collections-chargeoff.json",
      "kitchen-sink.json",
      "late-payments.json",
      "repo-judgment.json",
    ]);
  });

  it.each(jsonFiles)("%s validates and is unmistakably synthetic", (file) => {
    const report = load(file);
    expect(report.synthetic).toBe(true);
    expect(report.disclaimer).toBe(SYNTHETIC_DISCLAIMER);
    // 999 is never issued as a real SSN area number.
    expect(report.consumer.ssnMasked).toMatch(/^999-XX-\d{4}$/);
    const txt = readFileSync(join(FIXTURE_DIR, file.replace(/\.json$/, ".txt")), "utf8");
    expect(txt).toContain("FICTITIOUS TEST DATA");
    expect(txt).toContain(SYNTHETIC_DISCLAIMER);
  });

  it.each(jsonFiles)("%s summary matches its contents", (file) => {
    const report = load(file);
    expect(report.summary.totalAccounts).toBe(report.tradelines.length);
    expect(report.summary.collectionsCount).toBe(report.collections.length);
    expect(report.summary.publicRecordCount).toBe(report.publicRecords.length);
    expect(report.summary.hardInquiries).toBe(
      report.inquiries.filter((i) => i.inquiryType === "HARD").length
    );
    expect(report.summary.derogatoryAccounts).toBe(
      report.tradelines.filter((t) => DEROGATORY_STATUSES.has(t.status)).length
    );
    expect(report.summary.totalBalance).toBe(
      report.tradelines.reduce((s, t) => s + t.balance, 0) +
        report.collections.reduce((s, c) => s + c.currentBalance, 0)
    );
  });

  it("covers the derogatory-mark spectrum across personas", () => {
    const reports = jsonFiles.map(load);
    const tradelineStatuses = new Set(reports.flatMap((r) => r.tradelines.map((t) => t.status)));
    const recordTypes = new Set(reports.flatMap((r) => r.publicRecords.map((p) => p.recordType)));
    const collectionTypes = new Set(reports.flatMap((r) => r.collections.map((c) => c.collectionType)));

    for (const status of ["LATE_30", "LATE_90", "CHARGE_OFF", "REPOSSESSION", "FORECLOSURE", "INCLUDED_IN_BANKRUPTCY"]) {
      expect(tradelineStatuses).toContain(status);
    }
    for (const record of ["BANKRUPTCY_CH7", "BANKRUPTCY_CH13", "CIVIL_JUDGMENT", "TAX_LIEN"]) {
      expect(recordTypes).toContain(record);
    }
    expect(collectionTypes).toContain("MEDICAL");

    const clean = reports.find((r) => r.reportId === "SAMPLE-0001");
    expect(clean?.summary.derogatoryAccounts).toBe(0);
    expect(clean?.summary.collectionsCount).toBe(0);
    expect(clean?.summary.publicRecordCount).toBe(0);
  });
});
