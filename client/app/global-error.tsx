"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center bg-white p-4">
          <div className="rounded-full bg-red-100 p-4">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Critical Error
            </h2>
            <p className="text-slate-500 max-w-[500px]">
              {error.message || "A critical system error occurred."}
            </p>
          </div>
          <button
            onClick={() => reset()}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
