import { describe, expect, it } from "vitest";
import ms from "../../src/lib/ms";

describe("ms", () => {
  it("parses minutes", () => {
    expect(ms("15m")).toBe(15 * 60_000);
  });

  it("parses days", () => {
    expect(ms("30d")).toBe(30 * 86_400_000);
  });

  it("parses seconds and milliseconds", () => {
    expect(ms("500ms")).toBe(500);
    expect(ms("10s")).toBe(10_000);
  });

  it("throws on an invalid duration", () => {
    expect(() => ms("banana")).toThrow();
    expect(() => ms("10")).toThrow();
  });
});
