import { useState } from "react";
import { Select } from "../ui/Field";
import { Button } from "../ui/Button";
import { useCustomers } from "../../api/customers";
import { NewCustomerModal } from "./NewCustomerModal";

export function CustomerPicker({
  value,
  onChange,
  label = "Customer",
}: {
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const customers = useCustomers();

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Select label={label} value={value} onChange={(e) => onChange(e.target.value)} required>
          <option value="">Select a customer…</option>
          {customers.data?.data.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.companyName ? ` · ${c.companyName}` : ""}
            </option>
          ))}
        </Select>
      </div>
      <Button type="button" variant="secondary" onClick={() => setCreateOpen(true)}>
        + New
      </Button>

      <NewCustomerModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(customer) => onChange(customer.id)}
      />
    </div>
  );
}
