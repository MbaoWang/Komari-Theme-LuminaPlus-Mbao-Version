import { describe, expect, it } from "vitest";
import { detectBrowserLanguage } from "@/i18n";

describe("detectBrowserLanguage", () => {
  it("maps Traditional Chinese browser locales to zh-TW", () => {
    expect(detectBrowserLanguage(["zh-TW", "en-US"])).toBe("zh-TW");
    expect(detectBrowserLanguage(["zh-HK"])).toBe("zh-TW");
    expect(detectBrowserLanguage(["zh-MO"])).toBe("zh-TW");
    expect(detectBrowserLanguage(["zh-Hant-TW"])).toBe("zh-TW");
  });

  it("maps Simplified Chinese browser locales to zh-CN", () => {
    expect(detectBrowserLanguage(["zh-CN"])).toBe("zh-CN");
    expect(detectBrowserLanguage(["zh-SG"])).toBe("zh-CN");
    expect(detectBrowserLanguage(["zh-Hans"])).toBe("zh-CN");
    expect(detectBrowserLanguage(["zh"])).toBe("zh-CN");
  });

  it("maps English and other locales to en", () => {
    expect(detectBrowserLanguage(["en-US"])).toBe("en");
    expect(detectBrowserLanguage(["ja-JP"])).toBe("en");
  });
});
