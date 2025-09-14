"use client";

type Props = { show: boolean; label?: string };

export default function LoadingOverlay({ show, label = "Operazione in corso..." }: Props) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[1px] flex items-center justify-center">
      <div className="card border-slate-200 p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="spinner-dots">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
          <span className="text-sm text-slate-700">{label}</span>
        </div>
      </div>
    </div>
  );
}