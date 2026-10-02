// Shared page frame, so every page has the same column width, left edge
// (matching the nav bar) and header treatment. Pages whose header depends
// on client state (Today's date rolls over at midnight) omit `title` and
// render a PageHeader themselves.
export function Page({
  title,
  eyebrow,
  lede,
  children,
}: {
  title?: string;
  eyebrow?: React.ReactNode;
  lede?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-8 sm:py-10"
    >
      {title !== undefined && <PageHeader title={title} eyebrow={eyebrow} lede={lede} />}
      {children}
    </main>
  );
}

export function PageHeader({
  title,
  eyebrow,
  lede,
}: {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  lede?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-balance">{title}</h1>
      {lede && <p className="max-w-[62ch] text-muted">{lede}</p>}
    </header>
  );
}
