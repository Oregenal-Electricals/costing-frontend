"use client";
import MasterPage from "@/components/master-data/MasterPage";
import SimpleModal from "@/components/master-data/SimpleModal";

const COLUMNS = [
  { key: "code", label: "Code" },
  { key: "name", label: "Name" },
  { key: "contactName", label: "Contact" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
];

const FIELDS = [
  { name: "code", label: "Customer Code", required: true, readOnlyOnEdit: true },
  { name: "name", label: "Customer Name", required: true },
  { name: "contactName", label: "Contact Name" },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email" },
  { name: "address", label: "Address" },
];

export default function CustomersPage() {
  return (
    <MasterPage
      title="Customers"
      entity="customers"
      columns={COLUMNS}
      renderForm={(item, onClose, onSaved) => (
        <SimpleModal title="Customer" entity="customers" fields={FIELDS} item={item} onClose={onClose} onSaved={onSaved} />
      )}
    />
  );
}
