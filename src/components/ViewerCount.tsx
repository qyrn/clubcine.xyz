"use client";

import { useViewerCount } from "@/lib/use-viewer-count";

export default function ViewerCount() {
  const count = Math.max(1, useViewerCount());

  return (
    <span className="font-mono text-[12px] text-ink-3">
      {count} connect{count > 1 ? "és" : "é"}
    </span>
  );
}
