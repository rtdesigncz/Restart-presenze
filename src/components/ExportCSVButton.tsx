"use client";

type Props = {
  filename: string;
  rows: any[];
};

export default function ExportCSVButton({ filename, rows }: Props) {
  const handleExport = () => {
    if (!rows || rows.length === 0) return;

    const header = Object.keys(rows[0]).join(",");
    const csvRows = rows.map((r) =>
      Object.values(r)
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header, ...csvRows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button onClick={handleExport} className="btn btn-ghost btn-xs">
      Export CSV
    </button>
  );
}