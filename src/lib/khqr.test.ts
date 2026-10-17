import { describe, expect, it } from "vitest";
import { buildKhqr, crc16 } from "./khqr";

describe("khqr", () => {
  it("uses the standard CRC16-CCITT-FALSE check value", () => {
    expect(crc16("123456789")).toBe("29B1");
  });

  it("builds a USD dynamic QR ending in a valid checksum", () => {
    const { qr, md5 } = buildKhqr({
      accountId: "shop@aba", merchantName: "ProvisionKH", amountUsd: 59.94,
      billNumber: "PAY-5003", createdAtMs: 1, expiresAtMs: 2,
    });
    expect(qr).toContain("5405" + "59.94");
    expect(qr).toContain("5303840");
    expect(qr.slice(-4)).toBe(crc16(qr.slice(0, -4)));
    expect(md5).toHaveLength(32);
  });

  it("rejects a malformed account id", () => {
    expect(() => buildKhqr({ accountId: "bad", merchantName: "x", amountUsd: 1, billNumber: "a", createdAtMs: 1, expiresAtMs: 2 })).toThrow();
  });
});
