"use client";

import { useState } from "react";

export function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button
      onClick={copy}
      className="text-xs font-semibold px-2 py-0.5 rounded-lg transition-colors"
      style={copied
        ? { backgroundColor: "#DCFCE7", color: "#16A34A" }
        : { backgroundColor: "#F3F4F6", color: "#6B7280" }
      }
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
