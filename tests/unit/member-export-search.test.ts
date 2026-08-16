import { describe, expect, it } from "vitest";
import { memberExportSearchWhere } from "../../apps/api/src/lib/member-export-search";

describe("memberExportSearchWhere", () => {
  it("returns empty object for blank q", () => {
    expect(memberExportSearchWhere("")).toEqual({});
    expect(memberExportSearchWhere("   ")).toEqual({});
  });

  it("filters name or phone when q is set", () => {
    expect(memberExportSearchWhere("  ali  ")).toEqual({
      OR: [
        { fullName: { contains: "ali", mode: "insensitive" } },
        { phone: { contains: "ali" } },
      ],
    });
  });
});
