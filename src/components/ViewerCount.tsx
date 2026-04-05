"use client";

import { useEffect, useState } from "react";

export default function ViewerCount() {
  const [count, setCount] = useState(1);

  useEffect(() => {
    setCount(1);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green" />
      <span className="font-[var(--font-display)] text-[10px] text-text-dim">
        {count} connect{count > 1 ? "s" : ""}
      </span>
    </div>
  );
}
