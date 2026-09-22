import { Select } from "../ui/Field";
import { useProducts } from "../../api/products";

export function ProductPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  const products = useProducts();

  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">Select a product…</option>
      {products.data?.data.map((p) => (
        <option key={p.id} value={p.id}>
          {p.sku} · {p.name}
        </option>
      ))}
    </Select>
  );
}
