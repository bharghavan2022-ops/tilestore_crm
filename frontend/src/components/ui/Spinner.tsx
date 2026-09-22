export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-4 w-4 animate-spin rounded-full border-2 border-brass/30 border-t-brass ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function FullScreenSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-cream">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
