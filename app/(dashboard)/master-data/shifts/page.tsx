"use client";

import RoleGuard from "@/components/auth/RoleGuard";
import MasterPage from "@/components/master-data/MasterPage";
import SimpleModal from "@/components/master-data/SimpleModal";

const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "type", label: "Type" },
  { key: "startTime", label: "Start Time" },
  { key: "endTime", label: "End Time" },
];

const FIELDS = [
  { name: "name", label: "Shift Name", required: true },
  { name: "type", label: "Shift Type", required: true, type: "select" as const, options: [
    { value: "MORNING", label: "Morning" },
    { value: "AFTERNOON", label: "Afternoon" },
    { value: "NIGHT", label: "Night" },
  ]},
  { name: "startTime", label: "Start Time", required: true, type: "time" as const },
  { name: "endTime", label: "End Time", required: true, type: "time" as const },
];

export default function ShiftsPage() {
  return (
    <MasterPage
      title="Shifts"
      entity="shifts"
      columns={COLUMNS}
      renderForm={(item, onClose, onSaved) => (
        <SimpleModal title="Shift" entity="shifts" fields={FIELDS} item={item} onClose={onClose} onSaved={onSaved} />
      )}
    />
  );
}
