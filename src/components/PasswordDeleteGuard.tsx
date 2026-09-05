"use client";

import { useRef, useState } from "react";
import { verifyDeletePassword } from "@/app/(app)/delete-security";

type DeleteRequest = {
  title?: string;
  description: string;
  onVerified: () => void | Promise<void>;
};

export function usePasswordDelete() {
  const [request, setRequest] = useState<DeleteRequest | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const actionRef = useRef<DeleteRequest["onVerified"] | null>(null);

  function requestDelete(next: DeleteRequest) {
    actionRef.current = next.onVerified;
    setRequest(next);
    setPassword("");
    setError(null);
  }

  function close() {
    if (checking) return;
    actionRef.current = null;
    setRequest(null);
    setPassword("");
    setError(null);
  }

  async function confirmDelete(event: React.FormEvent) {
    event.preventDefault();
    setChecking(true);
    setError(null);
    const result = await verifyDeletePassword(password);
    if (!result.ok) {
      setChecking(false);
      setError(result.error || "ตรวจสอบรหัสผ่านไม่สำเร็จ");
      return;
    }

    const action = actionRef.current;
    actionRef.current = null;
    setRequest(null);
    setPassword("");
    try {
      await action?.();
    } finally {
      setChecking(false);
    }
  }

  const deletePasswordDialog = request ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" onClick={close}>
      <form
        onSubmit={confirmDelete}
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-800">{request.title || "ยืนยันการลบ"}</h3>
        <p className="mt-2 text-sm text-slate-600">{request.description}</p>
        <label className="mt-4 block text-sm font-medium text-slate-700">รหัสผ่านของผู้ใช้ปัจจุบัน</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoFocus
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="กรอกรหัสผ่านเพื่อยืนยัน"
        />
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={close} disabled={checking} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
            ยกเลิก
          </button>
          <button type="submit" disabled={checking || !password} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {checking ? "กำลังตรวจสอบ..." : "ยืนยันและลบ"}
          </button>
        </div>
      </form>
    </div>
  ) : null;

  return { requestDelete, deletePasswordDialog };
}
