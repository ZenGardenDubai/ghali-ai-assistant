"use client";

import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.captureException(error);
  }, [error, posthog]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0f1e] text-white">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-white/50">We&apos;ve logged this error and will look into it.</p>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-[#ED6B23] px-6 py-3 font-medium transition-all hover:bg-[#d45e1f]"
      >
        Try again
      </button>
    </div>
  );
}
