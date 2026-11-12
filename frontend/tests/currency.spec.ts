import { test, expect } from "@playwright/test";
import { compactMoney, formatGBP, money, signedMoney, toMinor } from "../lib/utils/format";

// Unicode minus (U+2212) is used for negatives in signedMoney.
test.describe("GBP formatting and pence arithmetic", () => {
  test("pence render as British pounds", () => {
    expect(money(425075)).toBe("£4,250.75");
    expect(money(1000)).toBe("£10.00");
    expect(money(12550)).toBe("£125.50");
    expect(money(125000)).toBe("£1,250.00");
    expect(money(1245075)).toBe("£12,450.75");
    expect(money(12568090)).toBe("£125,680.90");
    expect(formatGBP(1250)).toBe("£1,250.00");
  });
  test("never defaults to dollars", () => {
    for (const v of [0, 1, 99, 100, 425075, -1499]) {
      const out = money(v);
      expect(out).not.toContain("$");
      expect(out).not.toContain("US");
      expect(out).toMatch(/£/);
    }
  });
  test("signed and compact amounts", () => {
    expect(signedMoney(-1499)).toBe("−£14.99");
    expect(signedMoney(65000)).toBe("+£650.00");
    expect(compactMoney(1_000_000)).toBe("£10k");
  });
  test("decimal input converts to exact integer pence", () => {
    expect(toMinor("12.50")).toBe(1250);
    expect(toMinor("0.10") + toMinor("0.20")).toBe(30);
    expect(toMinor("1.15")).toBe(115);
    expect(toMinor("19.99")).toBe(1999);
    expect(toMinor("5")).toBe(500);
    expect(toMinor("1000000.00")).toBe(100_000_000);
  });
});
