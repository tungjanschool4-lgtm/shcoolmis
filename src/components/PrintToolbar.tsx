"use client";

export default function PrintToolbar({ title }: { title: string }) {
  return (
    <div className="no-print sticky top-0 z-10 bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between">
      <div className="text-sm">
        <button onClick={() => window.close()} className="text-slate-300 hover:text-white mr-3">✕ ปิด</button>
        {title}
      </div>
      <button
        onClick={async () => {
          await document.fonts.ready;
          await Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => undefined)));
          window.print();
        }}
        className="rounded-lg bg-indigo-500 hover:bg-indigo-400 px-4 py-1.5 text-sm font-medium"
      >
        🖨️ พิมพ์ / บันทึกเป็น PDF
      </button>
    </div>
  );
}
