"use client";

import { useEffect, useState } from "react";

export default function ViewerCount() {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const update = () => setCount(1);
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="font-mono text-[12px] text-ink-3">
      {count} connect{count > 1 ? "és" : "é"}
    </span>
  );
}
