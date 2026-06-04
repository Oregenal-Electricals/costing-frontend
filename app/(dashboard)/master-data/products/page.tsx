"use client";
import MasterPage from "@/components/master-data/MasterPage";
import SimpleModal from "@/components/master-data/SimpleModal";

const COLUMNS = [
  { key: "code", label: "Code" },
  { key: "name", label: "Name" },
  { key: "unit", label: "Unit" },
  { key: "description", label: "Description" },
];

const FIELDS = [
  { name: "code", label: "Product Code", required: true, readOnlyOnEdit: true },
  { name: "name", label: "Product Name", required: true },
  { name: "unit", label: "Unit", type: "select" as const, options: [
    { value: "PCS", label: "PCS" }, { value: "KG", label: "KG" },
    { value: "MTR", label: "MTR" }, { value: "BOX", label: "BOX" },
  ]},
  { name: "description", label: "Description" },
];

export default function ProductsPage() {
  return (
    <MasterPage
      title="Products"
      entity="products"
      columns={COLUMNS}
      renderForm={(item, onClose, onSaved) => (
        <SimpleModal title="Product" entity="products" fields={FIELDS} item={item} onClose={onClose} onSaved={onSaved} />
      )}
    />
  );
}
