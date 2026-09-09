"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export default function CriteriaPdfCard({ classId }: { classId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const folder = `criteria/class-${classId}`;
  const path = `${folder}/criteria.pdf`;

  useEffect(() => {
    let active = true;

    async function findPdf() {
      const { data, error } = await supabase.storage.from("assets").list(folder, {
        search: "criteria.pdf",
        limit: 1,
      });

      if (!active) return;
      if (!error && data?.some((file) => file.name === "criteria.pdf")) {
        const { data: publicData } = supabase.storage.from("assets").getPublicUrl(path);
        setPdfUrl(`${publicData.publicUrl}?v=${Date.now()}`);
      }
      setLoading(false);
    }

    void findPdf();
    return () => {
      active = false;
    };
  }, [folder, path, supabase]);

  async function uploadPdf(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setMessage("กรุณาเลือกไฟล์ PDF เท่านั้น");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage("ไฟล์ PDF ต้องมีขนาดไม่เกิน 20 MB");
      return;
    }

    setUploading(true);
    setMessage(null);
    const { error } = await supabase.storage.from("assets").upload(path, file, {
      contentType: "application/pdf",
      cacheControl: "0",
      upsert: true,
    });

    if (error) {
      setMessage(`อัปโหลดไม่สำเร็จ: ${error.message}`);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("assets").getPublicUrl(path);
    setPdfUrl(`${data.publicUrl}?v=${Date.now()}`);
    setMessage("แนบไฟล์ PDF เรียบร้อยแล้ว");
    setUploading(false);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="text-3xl">📐</div>
      <div className="mt-3 font-semibold text-slate-800">เกณฑ์การประเมิน</div>
      <div className="text-sm text-slate-500 mt-1">
        แนบไฟล์ PDF เกณฑ์การประเมินของชั้นเรียนนี้ และเปิดดูไฟล์ที่แนบไว้ได้ทันที
      </div>

      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={uploadPdf} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? "กำลังอัปโหลด..." : pdfUrl ? "เปลี่ยนไฟล์ PDF" : "แนบไฟล์ PDF"}
        </button>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-100"
          >
            เปิดไฟล์ PDF ↗
          </a>
        )}
        <Link
          href={`/print/${classId}/criteria`}
          target="_blank"
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200"
        >
          หน้าเกณฑ์ของระบบ ↗
        </Link>
      </div>

      {loading && <div className="mt-2 text-xs text-slate-400">กำลังตรวจสอบไฟล์ที่แนบไว้...</div>}
      {message && (
        <div className={`mt-2 text-xs ${message.startsWith("อัปโหลดไม่สำเร็จ") || message.startsWith("กรุณา") || message.startsWith("ไฟล์ PDF") ? "text-rose-600" : "text-emerald-600"}`}>
          {message}
        </div>
      )}
    </div>
  );
}
