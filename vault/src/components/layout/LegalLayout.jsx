export default function LegalLayout({ title, updated, children }) {
  return (
    <div className="container-vault py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-white/50">Last updated: {updated}</p>
        <div className="prose-vault mt-10 space-y-8 text-white/75">{children}</div>
      </div>
    </div>
  );
}
