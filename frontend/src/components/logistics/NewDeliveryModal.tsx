import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../ui/Modal";
import { Input, Select } from "../ui/Field";
import { Button } from "../ui/Button";
import { useOrders } from "../../api/orders";
import { useVehicles, useCreateDelivery } from "../../api/logistics";
import { useToast } from "../ui/Toast";
import { getApiErrorMessage } from "../../lib/apiClient";

export function NewDeliveryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const readyOrders = useOrders({ status: "READY_FOR_DISPATCH" });
  const vehicles = useVehicles();
  const createDelivery = useCreateDelivery();

  const [orderId, setOrderId] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setOrderId("");
    setDestinationAddress("");
    setVehicleId("");
    setDriverName("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const delivery = await createDelivery.mutateAsync({
        orderId,
        destinationAddress,
        vehicleId: vehicleId || undefined,
        driverName: driverName || undefined,
      });
      notify("Delivery scheduled");
      reset();
      onClose();
      navigate(`/logistics/${delivery.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New delivery">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Select
          label="Order (must be ready for dispatch)"
          value={orderId}
          onChange={(e) => {
            const order = readyOrders.data?.data.find((o) => o.id === e.target.value);
            setOrderId(e.target.value);
            if (order?.customer.address) setDestinationAddress(order.customer.address);
          }}
          required
        >
          <option value="">Select an order…</option>
          {readyOrders.data?.data.map((o) => (
            <option key={o.id} value={o.id}>
              {o.orderNumber} · {o.customer.name}
            </option>
          ))}
        </Select>
        {readyOrders.data?.data.length === 0 && (
          <p className="text-xs text-muted">No orders are currently ready for dispatch.</p>
        )}
        <Input
          label="Destination address"
          required
          value={destinationAddress}
          onChange={(e) => setDestinationAddress(e.target.value)}
        />
        <Select label="Vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          <option value="">Unassigned</option>
          {vehicles.data?.map((v) => (
            <option key={v.id} value={v.id}>
              {v.registrationNumber}
            </option>
          ))}
        </Select>
        <Input label="Driver name" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
        {error && <p className="text-sm text-status-critical">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createDelivery.isPending} disabled={!orderId || !destinationAddress}>
            Schedule delivery
          </Button>
        </div>
      </form>
    </Modal>
  );
}
