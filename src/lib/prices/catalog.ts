export type PriceCatalogItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string | null;
  description: string | null;
  active: boolean;
  sortOrder: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type PriceInput = {
  name?: unknown;
  category?: unknown;
  price?: unknown;
  unit?: unknown;
  description?: unknown;
  active?: unknown;
  sortOrder?: unknown;
};

export const BASE_PRICE_CATEGORIES = ["Servicios", "Productos", "Diagnóstico"] as const;

const text = (value: unknown, label: string, max: number) => {
  if (typeof value !== "string") throw new Error(`${label} es requerido.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new Error(`${label} es inválido.`);
  return normalized;
};

const optionalText = (value: unknown, max: number) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error("El texto opcional es inválido.");
  const normalized = value.trim();
  return normalized ? normalized.slice(0, max) : null;
};

export function validatePriceInput(input: PriceInput) {
  const price = input.price;
  if (!Number.isInteger(price) || Number(price) < 0) throw new Error("El precio debe ser un entero no negativo.");
  const sortOrder = input.sortOrder === undefined ? 0 : input.sortOrder;
  if (!Number.isInteger(sortOrder) || Number(sortOrder) < 0) throw new Error("El orden debe ser un entero no negativo.");
  if (input.active !== undefined && typeof input.active !== "boolean") throw new Error("El estado activo es inválido.");
  return {
    name: text(input.name, "El nombre", 120),
    category: text(input.category, "La categoría", 80),
    price: Number(price),
    unit: optionalText(input.unit, 40),
    description: optionalText(input.description, 500),
    active: input.active === undefined ? true : input.active,
    sortOrder: Number(sortOrder),
  };
}

export function searchPrices(items: readonly PriceCatalogItem[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [...items];
  return items.filter((item) => `${item.name} ${item.category} ${item.description ?? ""}`.toLocaleLowerCase().includes(normalized));
}

export function filterPrices(items: readonly PriceCatalogItem[], filter: { active: "active" | "inactive" | "all"; category: string }) {
  return items.filter((item) => (filter.active === "all" || (filter.active === "active" ? item.active : !item.active)) && (filter.category === "all" || item.category === filter.category));
}

export function categoryOptions(items: readonly PriceCatalogItem[]) {
  const categories = new Set<string>(BASE_PRICE_CATEGORIES);
  for (const item of items) categories.add(item.category);
  return [...categories].sort((left, right) => { const leftBase = BASE_PRICE_CATEGORIES.indexOf(left as typeof BASE_PRICE_CATEGORIES[number]); const rightBase = BASE_PRICE_CATEGORIES.indexOf(right as typeof BASE_PRICE_CATEGORIES[number]); if (leftBase !== -1 || rightBase !== -1) return (leftBase === -1 ? 99 : leftBase) - (rightBase === -1 ? 99 : rightBase); return left.localeCompare(right, "es"); });
}
