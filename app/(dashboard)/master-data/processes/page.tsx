"use client";
import MasterPage from "@/components/master-data/MasterPage";
import SimpleModal from "@/components/master-data/SimpleModal";

const COLUMNS = [
  { key: "code", label: "Code" },
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
];

const FIELDS = [
  { name: "code", label: "Process Code", required: true, readOnlyOnEdit: true },
  { name: "name", label: "Process Name", required: true },
  { name: "description", label: "Description" },
];

export default function ProcessesPage() {
  return (
    <MasterPage
      title="Processes"
      entity="processes"
      columns={COLUMNS}
      renderForm={(item, onClose, onSaved) => (
        <SimpleModal title="Process" entity="processes" fields={FIELDS} item={item} onClose={onClose} onSaved={onSaved} />
      )}
    />
  );
}
