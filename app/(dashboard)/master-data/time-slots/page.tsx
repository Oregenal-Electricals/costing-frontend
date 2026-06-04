"use client";
import { useEffect, useState } from "react";
import MasterPage from "@/components/master-data/MasterPage";
import SimpleModal from "@/components/master-data/SimpleModal";
import { apiGetActiveShifts, ShiftItem } from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function TimeSlotsPage() {
  const [shifts, setShifts] = useState<ShiftItem[]>([]);

  useEffect(() => {
    const token = getToken();
    if (token) apiGetActiveShifts(token).then(setShifts).catch(console.error);
  }, []);

  const COLUMNS = [
    { key: "label", label: "Label" },
    { key: "startTime", label: "Start" },
    { key: "endTime", label: "End" },
    { key: "sortOrder", label: "Order" },
    {
      key: "shift",
      label: "Shift",
      render: (row: Record<string, unknown>) => {
        const shift = row.shift as { name: string } | undefined;
        return shift?.name || '—';
      },
    },
  ];

  const FIELDS = [
    { name: "shiftId", label: "Shift", required: true, type: "select" as const,
      options: shifts.map((s) => ({ value: s.id, label: s.name })) },
    { name: "label", label: "Label (e.g. 6:00-7:00)", required: true },
    { name: "startTime", label: "Start Time", required: true, type: "time" as const },
    { name: "endTime", label: "End Time", required: true, type: "time" as const },
    { name: "sortOrder", label: "Sort Order", type: "number" as const },
  ];

  return (
    <MasterPage
      title="Time Slots"
      entity="time-slots"
      columns={COLUMNS}
      renderForm={(item, onClose, onSaved) => (
        <SimpleModal title="Time Slot" entity="time-slots" fields={FIELDS} item={item} onClose={onClose} onSaved={onSaved} />
      )}
    />
  );
}
