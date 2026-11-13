import Button from "../components/ui/Button.jsx";

export default function ComingSoon({ title, note }) {
  return (
    <div className="container-vault flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-gold-500">
        Coming soon
      </span>
      <h1 className="mt-6 text-3xl font-extrabold text-white sm:text-4xl">{title}</h1>
      <p className="mt-4 max-w-md text-white/60">{note}</p>
      <Button to="/" variant="secondary" className="mt-8">
        Back to home
      </Button>
    </div>
  );
}
