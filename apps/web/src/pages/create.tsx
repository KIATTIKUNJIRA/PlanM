
import React from "react";
import dynamic from "next/dynamic";

// โหลดฟอร์มเดิมของคุณ (เปลี่ยน path ตามโปรเจกต์จริง ถ้าไม่ใช่ไฟล์นี้)
import { ProjectForm } from "@/components/forms/CreateForms";

export default function CreatePage() {
  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">สร้างใหม่…</h1>
      <ProjectForm />
    </main>
  );
}