// Pure KHQR (EMVCo) builder for a personal Bakong account. No network, safe anywhere.
import { md5 } from "js-md5";

function tlv(tag: string, value: string) {
  return `${tag}${String(value.length).padStart(2, "0")}${value}`;
}

/** CRC16-CCITT-FALSE (poly 0x1021, init 0xFFFF), uppercase 4-hex. */
export function crc16(input: string) {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export type KhqrInput = {
  accountId: string; // e.g. name@aba
  merchantName: string;
  merchantCity?: string;
  amountUsd: number;
  billNumber: string;
  createdAtMs: number;
  expiresAtMs: number;
};

export function buildKhqr(i: KhqrInput) {
  if (!/^[^@\s]+@[^@\s]+$/.test(i.accountId)) throw new Error("Invalid Bakong account ID");
  if (!(i.amountUsd > 0)) throw new Error("Amount must be positive");
  const amount = (Math.round(i.amountUsd * 100) / 100).toFixed(2).replace(/\.?0+$/, "");
  const body =
    tlv("00", "01") +
    tlv("01", "12") +
    tlv("29", tlv("00", i.accountId)) +
    tlv("52", "5999") +
    tlv("53", "840") +
    tlv("54", amount) +
    tlv("58", "KH") +
    tlv("59", i.merchantName.slice(0, 25)) +
    tlv("60", (i.merchantCity ?? "Phnom Penh").slice(0, 15)) +
    tlv("62", tlv("01", i.billNumber.slice(0, 25))) +
    tlv("99", tlv("00", String(i.createdAtMs)) + tlv("01", String(i.expiresAtMs))) +
    "6304";
  const qr = body + crc16(body);
  return { qr, md5: md5(qr) };
}
