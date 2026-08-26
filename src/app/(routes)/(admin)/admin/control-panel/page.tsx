import { getAllFormFields, getAllFormSubmissions } from "@/lib/actions/form-config";
import ControlPanelClient from "./control-panel-client";

export const metadata = { title: "Control Panel — Admin" };

export default async function ControlPanelPage() {
  const [stemFest, campusAmbassador, stemFestResponses, ambassadorResponses] =
    await Promise.all([
      getAllFormFields("stem-fest"),
      getAllFormFields("campus-ambassador"),
      getAllFormSubmissions("stem-fest"),
      getAllFormSubmissions("campus-ambassador"),
    ]);


  return (
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <div>
        <p className="mb-2 font-mono text-[0.6rem] font-medium uppercase tracking-[0.28em] text-ion">
          Administration
        </p>
        <h1 className="font-voyage text-3xl font-bold uppercase tracking-tight text-space-ivory">
          Control Panel
        </h1>
        <p className="mt-2 max-w-xl font-space-body text-sm text-space-muted">
          Edit the fields of both registration forms, add or remove fields of
          any type, and toggle whether each field is accepting responses.
        </p>
      </div>
      <ControlPanelClient
        initialFields={{ "stem-fest": stemFest, "campus-ambassador": campusAmbassador }}
      />

      <section className="space-y-4">
        <h2 className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.28em] text-space-muted">
          Recent responses ({stemFestResponses.length + ambassadorResponses.length})
        </h2>
        {[
          { label: "STEM Fest", fields: stemFest, responses: stemFestResponses },
          { label: "Campus Ambassador", fields: campusAmbassador, responses: ambassadorResponses },
        ].map(({ label, fields, responses }) => (
          <div key={label} className="border border-space-line-soft bg-space-deep/60 p-5">
            <p className="font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-ion">
              {label} · {responses.length}{" "}
              {responses.length === 1 ? "response" : "responses"}
            </p>
            {responses.length === 0 ? (
              <p className="mt-3 text-sm text-space-muted">No responses yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-space-line-soft">
                {responses.slice(0, 5).map((response) => (
                  <li key={response.id} className="py-3 text-sm">
                    <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-space-muted">
                      {new Date(response.createdAt).toLocaleString("en-US")}
                    </span>
                    <p className="mt-1 text-space-ivory/90">
                      {fields
                        .filter((f) => response.data[f.name])
                        .slice(0, 3)
                        .map((f) => `${f.label}: ${response.data[f.name]}`)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
