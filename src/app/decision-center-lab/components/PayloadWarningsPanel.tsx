export function PayloadWarningsPanel({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-yellow-400/15 bg-yellow-400/[0.05] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-yellow-100/75">
        Payload warnings
      </p>
      <ul className="mt-3 grid gap-2 text-sm text-yellow-50/88">
        {warnings.map((warning, index) => (
          <li
            key={`${warning}-${index}`}
            className="rounded-2xl border border-yellow-300/10 bg-black/15 px-3 py-2"
          >
            {warning}
          </li>
        ))}
      </ul>
    </section>
  );
}
