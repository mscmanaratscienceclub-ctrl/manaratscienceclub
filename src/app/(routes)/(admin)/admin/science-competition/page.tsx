import { FlaskConical } from "lucide-react";

export default function ScienceCompetitionAdminPage() {
  return (
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <div>
        <p className="mb-2 font-mono text-[0.6rem] font-medium uppercase tracking-[0.28em] text-ion">
          Form Responses
        </p>
        <h1 className="font-voyage text-3xl font-bold uppercase tracking-tight text-space-ivory">
          Science Competition
        </h1>
        <p className="mt-2 font-space-body text-sm text-space-muted">
          Submissions for the upcoming science competition form.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center border border-dashed border-space-line px-6 py-24 text-center">
        <span className="mb-4 flex size-16 items-center justify-center border border-ion-line bg-ion-deep/40">
          <FlaskConical className="size-7 text-ion" />
        </span>
        <h2 className="font-voyage text-lg font-semibold uppercase tracking-wide text-space-ivory">Form not launched yet</h2>
        <p className="mt-2 max-w-md font-space-body text-sm text-space-muted">
          The science competition registration form has not been published. Once it is live,
          every submission will appear here with stats and a full response viewer.
        </p>
      </div>
    </div>
  );
}
