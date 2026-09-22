import type { CvContent } from "@/lib/cv-content";

// A read-only, document-like rendering of the structured CV. Kept separate
// from the studio so the same shape can be reused (and so the preview stays a
// plain, dependency-free component).
export function CvPreview({
  content,
  candidateName,
  contactLines,
  linkLines,
}: {
  content: CvContent;
  candidateName: string;
  contactLines: string[];
  linkLines: string[];
}) {
  const contact = [...contactLines, ...linkLines];
  return (
    <div className="rounded-md border border-border bg-white p-6 text-[13px] leading-relaxed text-zinc-900 shadow-sm sm:p-8">
      <header className="border-b border-zinc-200 pb-3">
        <h2 className="text-2xl font-bold tracking-tight">{candidateName}</h2>
        {content.headline && <p className="mt-0.5 text-sm text-zinc-600">{content.headline}</p>}
        {contact.length > 0 && <p className="mt-1.5 text-xs text-zinc-500">{contact.join("   ·   ")}</p>}
      </header>

      {content.summary && <p className="mt-4 whitespace-pre-line text-zinc-700">{content.summary}</p>}

      <div className="mt-5 flex flex-col gap-5">
        {content.sections.map((section) => (
          <section key={section.id}>
            <h3 className="border-b border-zinc-200 pb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-800">{section.title}</h3>
            <div className="mt-2 flex flex-col gap-3">
              {section.entries.map((entry) => (
                <div key={entry.id}>
                  {(entry.heading || entry.meta) && (
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      {entry.heading && <p className="font-semibold text-zinc-900">{entry.heading}</p>}
                      {entry.meta && <p className="text-xs italic text-zinc-500">{entry.meta}</p>}
                    </div>
                  )}
                  {entry.bullets.length > 0 && (
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-zinc-700 marker:text-zinc-400">
                      {entry.bullets.map((bullet, index) => (
                        <li key={index}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                  {entry.tags.length > 0 && <p className="mt-1 text-xs italic text-zinc-500">{entry.tags.join("   ·   ")}</p>}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {content.sections.length === 0 && (
        <p className="mt-6 text-sm text-zinc-400">CV vide — génère une première version ou ajoute une section.</p>
      )}
    </div>
  );
}
