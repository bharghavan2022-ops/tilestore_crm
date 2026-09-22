import { Topbar } from "../components/layout/Topbar";
import { Card } from "../components/ui/Card";

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <>
      <Topbar title={title} subtitle="Not built in this pass" />
      <Card className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <p className="text-sm font-medium text-ink-text">{title} is coming in a future pass</p>
        <p className="max-w-sm text-xs text-muted">
          The backend for this module is already live — see the API docs in the repo README. This screen just
          hasn't been built yet.
        </p>
      </Card>
    </>
  );
}
