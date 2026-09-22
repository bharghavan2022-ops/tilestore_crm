import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Field";
import { Button } from "../ui/Button";
import { CustomerPicker } from "../shared/CustomerPicker";
import { EmployeePicker } from "../shared/EmployeePicker";
import { useCreateLead } from "../../api/leads";
import { useToast } from "../ui/Toast";
import { getApiErrorMessage } from "../../lib/apiClient";

export function NewLeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const createLead = useCreateLead();
  const [customerId, setCustomerId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCustomerId("");
    setAssignedToId("");
    setSource("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const lead = await createLead.mutateAsync({
        customerId,
        assignedToId: assignedToId || undefined,
        source: source || undefined,
      });
      notify("Lead created");
      reset();
      onClose();
      navigate(`/crm/leads/${lead.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New lead">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <CustomerPicker value={customerId} onChange={setCustomerId} />
        <EmployeePicker value={assignedToId} onChange={setAssignedToId} label="Assign to salesperson" />
        <Input label="Source" placeholder="Walk-in, referral, website…" value={source} onChange={(e) => setSource(e.target.value)} />
        {error && <p className="text-sm text-status-critical">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createLead.isPending} disabled={!customerId}>
            Create lead
          </Button>
        </div>
      </form>
    </Modal>
  );
}
