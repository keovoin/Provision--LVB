export type DescBlock = { type: "text"; km: string; en: string } | { type: "image"; path: string };

export function parseBlocks(v: unknown): DescBlock[] {
  if (!Array.isArray(v)) return [];
  return v.filter((b): b is DescBlock => !!b && typeof b === "object" && ((b as DescBlock).type === "text" || ((b as DescBlock).type === "image" && typeof (b as { path?: unknown }).path === "string")));
}
