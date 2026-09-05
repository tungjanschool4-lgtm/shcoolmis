"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ClassTabs({ classId }: { classId: string }) {
  const pathname = usePathname();
  const base = `/classes/${classId}`;
  const tabs = [
    { href: base, label: "ภาพรวม" },
    { href: `${base}/students`, label: "นักเรียน" },
    { href: `${base}/subjects`, label: "รายวิชา" },
    { href: `${base}/grades`, label: "กรอกคะแนน" },
    { href: `${base}/characteristics`, label: "คุณลักษณะ" },
    { href: `${base}/readwrite`, label: "อ่านคิดเขียน" },
    { href: `${base}/activities`, label: "กิจกรรม" },
    { href: `${base}/transfer`, label: "เทียบโอน" },
    { href: `${base}/reports`, label: "รายงาน/PDF" },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200 no-print">
      {tabs.map((t) => {
        const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              active
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
