"use client";

import React, { Suspense } from "react";
import WorkflowDesigner from "../../components/WorkflowDesigner";

export default function DesignerPage() {
  return (
    <div className="h-screen w-screen bg-zinc-50/50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 flex flex-col font-sans transition-colors duration-200 overflow-hidden">
      <main className="flex-1 w-full h-full overflow-hidden flex flex-col">
        <Suspense fallback={<div className="p-8 text-center text-sm font-semibold">Loading Workflow Designer...</div>}>
          <WorkflowDesigner />
        </Suspense>
      </main>
    </div>
  );
}
