import { useState, type FormEvent } from "react";
import { Modal } from "../ui/Modal";
import { Input, Select } from "../ui/Field";
import { Button } from "../ui/Button";
import { useCreateCustomer } from "../../api/customers";
import { useToast } from "../ui/Toast";
import { getApiErrorMessage } from "../../lib/apiClient";
import type { Customer } from "../../types/api";

export function NewCustomerModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (customer: Customer) => void;
}) {
  const { notify } = useToast();
  const createCustomer = useCreateCustomer();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [segment, setSegment] = useState<Customer["segment"]>("RETAIL");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setPhone("");
    setEmail("");
    setSegment("RETAIL");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const customer = await createCustomer.mutateAsync({
        name,
        phone: phone || undefined,
        email: email || undefined,
        segment,
      });
      notify(`Customer "${customer.name}" created`);
      onCreated?.(customer);
      reset();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New customer">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Select label="Segment" value={segment} onChange={(e) => setSegment(e.target.value as Customer["segment"])}>
          <option value="RETAIL">Retail</option>
          <option value="ARCHITECT">Architect</option>
          <option value="BUILDER">Builder</option>
          <option value="CONTRACTOR">Contractor</option>
          <option value="OTHER">Other</option>
        </Select>
        {error && <p className="text-sm text-status-critical">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createCustomer.isPending}>
            Create customer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
