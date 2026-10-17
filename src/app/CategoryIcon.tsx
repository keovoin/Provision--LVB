import { CupSoda, Droplet, LayoutGrid, Milk, Package, Snowflake, SprayCan, Wheat, type LucideProps } from "lucide-react";

const icons = { wheat: Wheat, droplet: Droplet, milk: Milk, "cup-soda": CupSoda, "spray-can": SprayCan, snowflake: Snowflake, package: Package, all: LayoutGrid };

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = icons[name as keyof typeof icons] ?? Package;
  return <Icon {...props} />;
}
