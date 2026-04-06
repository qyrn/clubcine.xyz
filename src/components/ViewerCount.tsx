"use client";

import { useEffect, useState } from "react";

export default function ViewerCount() {
  const [count, setCount] = useState(1);

  useEffect(() => {
    setCount(1);
  }, []);

  return (
    <span className="text-[10px] text-muted font-[var(--font-ui)]">
      {count} connect{count > 1 ? "\u00e9s" : "\u00e9"}
    </span>
  );
}
