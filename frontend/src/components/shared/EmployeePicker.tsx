import { Select } from "../ui/Field";
import { useEmployees } from "../../api/employees";

export function EmployeePicker({
  value,
  onChange,
  label = "Assign to",
  allowUnassigned = true,
}: {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  allowUnassigned?: boolean;
}) {
  const employees = useEmployees();

  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {allowUnassigned && <option value="">Unassigned</option>}
      {employees.data?.data.map((e) => (
        <option key={e.id} value={e.id}>
          {e.name} {e.team ? `· ${e.team.name}` : ""}
        </option>
      ))}
    </Select>
  );
}
