import { FlaskConical } from "lucide-react";

export default function ScienceCompetitionAdminPage() {
  return (
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Science Competition</h1>
        <p className="mt-1 font-body text-ink/60">
          Submissions for the upcoming science competition form.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-surface/50 px-6 py-24 text-center">
        <div className="mb-4 rounded-2xl bg-manara-purple/10 p-4">
          <FlaskConical className="h-8 w-8 text-manara-purple" />
        </div>
        <h2 className="font-display text-xl font-semibold text-ink">Form not launched yet</h2>
        <p className="mt-2 max-w-md font-body text-sm text-ink/60">
          The science competition registration form has not been published. Once it is live,
          every submission will appear here with stats and a full response viewer.
        </p>
      </div>
    </div>
  );
}
