import { describe, expect, it } from "vitest";
import {
  detectBrowserCurrency,
  normalizeCurrencyPreference,
} from "@/utils/currency";
import {
  convertCnyToCurrency,
  formatMoney,
  formatMoneyParts,
  formatSignedMoney,
} from "@/utils/cost";

describe("currency detection and conversion", () => {
  it("detects display currency from browser locale and region", () => {
    expect(detectBrowserCurrency({ languages: ["zh-TW"] })).toBe("TWD");
    expect(detectBrowserCurrency({ languages: ["zh-HK"] })).toBe("HKD");
    expect(detectBrowserCurrency({ languages: ["zh-CN"] })).toBe("CNY");
    expect(detectBrowserCurrency({ languages: ["en-US"] })).toBe("USD");
    expect(detectBrowserCurrency({ languages: ["ja-JP"] })).toBe("JPY");
    expect(detectBrowserCurrency({ languages: ["en-GB"] })).toBe("GBP");
    expect(detectBrowserCurrency({ languages: ["de-DE"] })).toBe("EUR");
  });

  it("falls back to timezone when locale has no region", () => {
    expect(
      detectBrowserCurrency({ languages: ["en"], timeZone: "Asia/Taipei" }),
    ).toBe("TWD");
    expect(
      detectBrowserCurrency({ languages: ["en"], timeZone: "Asia/Shanghai" }),
    ).toBe("CNY");
  });

  it("normalizes currency preferences safely", () => {
    expect(normalizeCurrencyPreference("auto")).toBe("auto");
    expect(normalizeCurrencyPreference(" twd ")).toBe("TWD");
    expect(normalizeCurrencyPreference("UNKNOWN")).toBe("auto");
  });

  it("converts CNY amounts to other currencies using USD-based rates", () => {
    const rates = { USD: 1, CNY: 7.2, TWD: 32.4, JPY: 150 };
    expect(convertCnyToCurrency(72, "CNY", rates)).toBe(72);
    expect(convertCnyToCurrency(72, "USD", rates)).toBeCloseTo(10, 6);
    expect(convertCnyToCurrency(72, "TWD", rates)).toBeCloseTo(324, 6);
    expect(convertCnyToCurrency(72, "EUR", rates)).toBeNull();
  });

  it("formats money cleanly across currencies", () => {
    expect(formatMoney(1234.5, "TWD")).toBe("NT$ 1,234.50");
    expect(formatMoney(1234.5, "JPY")).toBe("JP¥ 1,235");
    expect(formatSignedMoney(-50, "USD")).toBe("-$ 50.00");
    expect(formatMoneyParts(1234.56, "TWD")).toEqual({
      symbol: "NT$",
      int: "1,234",
      frac: "56",
    });
    expect(formatMoneyParts(1234, "JPY")).toEqual({
      symbol: "JP¥",
      int: "1,234",
      frac: null,
    });
  });
});
