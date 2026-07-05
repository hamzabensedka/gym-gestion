import { describe, it, expect } from "vitest";
import { buildWhatsappQueue } from "@gym/shared/subscription";

describe("buildWhatsappQueue", () => {
  const members = [
    { id: "m1", fullName: "Ahmed", phone: "+216 20 111 222" },
    { id: "m2", fullName: "Sara", phone: "+21622111222" },
  ];

  it("builds one queue entry per member", () => {
    const queue = buildWhatsappQueue(members, (m) => `Hello ${m.fullName}`);
    expect(queue).toHaveLength(2);
    expect(queue[0].memberId).toBe("m1");
    expect(queue[1].fullName).toBe("Sara");
  });

  it("encodes message text in wa.me URLs", () => {
    const queue = buildWhatsappQueue(members.slice(0, 1), () => "Bonjour & merci");
    expect(queue[0].url).toContain("https://wa.me/21620111222");
    expect(queue[0].url).toContain(encodeURIComponent("Bonjour & merci"));
  });
});
