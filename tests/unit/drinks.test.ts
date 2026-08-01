import { describe, expect, it } from "vitest";
import {
  canSell,
  nextStockAfterSale,
  nextStockAfterRestock,
  sumDrinkRevenue,
} from "@/lib/drinks";

describe("canSell", () => {
  it("allows sale when quantity <= stock", () => {
    expect(canSell(10, 3)).toBe(true);
    expect(canSell(10, 10)).toBe(true);
  });

  it("blocks sale when quantity > stock", () => {
    expect(canSell(5, 6)).toBe(false);
  });
});

describe("nextStockAfterSale", () => {
  it("decrements stock by quantity", () => {
    expect(nextStockAfterSale(10, 3)).toBe(7);
  });

  it("throws when insufficient stock", () => {
    expect(() => nextStockAfterSale(5, 6)).toThrow("Insufficient stock");
  });
});

describe("nextStockAfterRestock", () => {
  it("increases stock by quantity", () => {
    expect(nextStockAfterRestock(10, 5)).toBe(15);
  });
});

describe("sumDrinkRevenue", () => {
  it("totals sale amounts", () => {
    expect(sumDrinkRevenue([{ total: 12 }, { total: 8.5 }])).toBe(20.5);
  });

  it("returns 0 for empty list", () => {
    expect(sumDrinkRevenue([])).toBe(0);
  });
});
