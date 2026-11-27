import { describe, expect, it } from "vitest";
import {
  getCarrierShortLabel,
  inferRouteTier,
  isRouteTag,
  normalizeNodeRoutes,
  parseRoutesFromTags,
  resolveNodeRoutes,
} from "@/utils/nodeRoutes";

describe("nodeRoutes", () => {
  it("classifies premium, optimized, and standard route tiers automatically", () => {
    expect(inferRouteTier("CN2 GIA")).toBe("premium");
    expect(inferRouteTier("CMIN2")).toBe("premium");
    expect(inferRouteTier("AS9929")).toBe("premium");
    expect(inferRouteTier("IEPL")).toBe("premium");

    expect(inferRouteTier("AS4837")).toBe("optimized");
    expect(inferRouteTier("CMI")).toBe("optimized");
    expect(inferRouteTier("SoftBank")).toBe("optimized");
    expect(inferRouteTier("HiNet")).toBe("optimized");

    expect(inferRouteTier("163")).toBe("standard");
    expect(inferRouteTier("BGP")).toBe("standard");
    expect(inferRouteTier("Cogent")).toBe("standard");
  });

  it("parses route tags with English/Chinese prefixes and optional tier overrides", () => {
    const parsed = parseRoutesFromTags(
      "移动优化;ct:CN2 GIA;cu:AS9929;移:CMIN2;互:BGP!standard;原生IP<green>",
    );
    expect(parsed).toEqual({
      ct: { label: "CN2 GIA" },
      cu: { label: "AS9929" },
      cm: { label: "CMIN2" },
      ix: { label: "BGP", tier: "standard" },
    });
    expect(isRouteTag("ct:CN2 GIA")).toBe(true);
    expect(isRouteTag("移:CMIN2")).toBe(true);
    expect(isRouteTag("原生IP<green>")).toBe(false);
  });

  it("lets theme settings override tag routes per carrier", () => {
    const resolved = resolveNodeRoutes(
      { ct: { label: "IEPL", tier: "premium" } },
      "ct:163;cu:AS4837;cm:CMIN2;ix:BGP",
    );
    expect(resolved).toEqual([
      { carrier: "ct", label: "IEPL", tier: "premium" },
      { carrier: "cu", label: "AS4837", tier: "optimized" },
      { carrier: "cm", label: "CMIN2", tier: "premium" },
      { carrier: "ix", label: "BGP", tier: "standard" },
    ]);
  });

  it("normalizes node routes cleanly and drops empty entries", () => {
    expect(
      normalizeNodeRoutes({
        " node-1 ": {
          ct: { label: " CN2 GIA ", tier: "auto" },
          cu: { label: "   " },
          cm: { label: "CMIN2", tier: "premium" },
        },
        empty: { ct: { label: "" } },
      }),
    ).toEqual({
      "node-1": {
        ct: { label: "CN2 GIA" },
        cm: { label: "CMIN2", tier: "premium" },
      },
    });
  });

  it("returns localized carrier short labels", () => {
    expect(getCarrierShortLabel("ct", "zh-TW")).toBe("電");
    expect(getCarrierShortLabel("cu", "zh-TW")).toBe("聯");
    expect(getCarrierShortLabel("ct", "zh-CN")).toBe("电");
    expect(getCarrierShortLabel("cu", "zh-CN")).toBe("联");
    expect(getCarrierShortLabel("cm", "en")).toBe("CM");
    expect(getCarrierShortLabel("ix", "en")).toBe("IX");
  });
});
