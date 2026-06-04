"use client";

import RoleGuard from "@/components/auth/RoleGuard";
import MasterPage from "@/components/master-data/MasterPage";
import SimpleModal from "@/components/master-data/SimpleModal";

const COLUMNS = [
  { key: "code", label: "Code" },
  { key: "name", label: "Name" },
  { key: "capacity", label: "Capacity" },
];

const FIELDS = [
  { name: "code", label: "Line Code", required: true, readOnlyOnEdit: true },
  { name: "name", label: "Line Name", required: true },
  { name: "capacity", label: "Capacity", type: "number" as const },
];

export default function LinesPage() {
  return (
    <MasterPage
      title="Lines"
      entity="lines"
      columns={COLUMNS}
      renderForm={(item, onClose, onSaved) => (
        <SimpleModal title="Line" entity="lines" fields={FIELDS} item={item} onClose={onClose} onSaved={onSaved} />
      )}
    />
  );
}
