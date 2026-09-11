import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Accordion from "../components/ui/Accordion.jsx";
import ScreenshotPlaceholder from "../components/ui/ScreenshotPlaceholder.jsx";
import PricingTable from "../components/PricingTable.jsx";
import beeyondLogo from "../assets/beeyond-logo.webp";

// Deliberately not framed as "what the adjuster left off" — Vault is a
// self-review tool the contractor runs on their own estimate before it goes
// out, not an adversarial claims-fighting pitch. Keep this list to the kind
// of ordinary, easy-to-miss oversights described in the product spec, not
// dramatic dollar claims.
const PAIN_EXAMPLES = [
  {
    title: "A line item never included",
    body: "A required component that just didn't make it onto the estimate — not because anyone did anything wrong, just an easy thing to miss when you're moving between jobs.",
  },
  {
    title: "A quantity that doesn't match the documented scope",
    body: "The measurements or photos on file suggest more area or material than what's actually priced out.",
  },
  {
    title: "A required component not clearly accounted for",
    body: "Something the job genuinely needs, but it's unclear from the estimate whether it's priced separately or assumed to be included.",
  },
  {
    title: "A code-related consideration that needs verification",
    body: "A code or manufacturer requirement that may apply to this job and is worth checking before the estimate goes out.",
  },
];

const FEATURES = [
  {
    label: "Estimate Review",
    title: "Upload your estimate and documentation. Get potential scope gaps flagged for review.",
    body: "Upload your estimate along with photos, notes, and measurements. Vault reviews them together against its knowledge base and flags items that may be missing or under-scoped — each one clearly marked as a suggestion for you to verify, never a claim of fact.",
  },
  {
    label: "The Vault",
    title: "The knowledge base behind every finding",
    body: "A maintained reference of commonly overlooked line items — roofing, water mitigation, mold, interior, exterior, and more — each with an Xactimate code, a Florida code citation where applicable, and a typical price range. This is what Estimate Review checks your documentation against.",
  },
  {
    label: "Documentation",
    title: "Turn selected findings into a professional document in minutes",
    body: "Approve the findings that apply, and generate a clean, editable PDF written from you, the contractor, describing your scope of work — never on behalf of the client, never arguing coverage. Export it and send it the same day.",
  },
];

const FAQ = [
  {
    q: "Is Beeyond Vault a public adjusting service?",
    a: "No. Beeyond Vault is an estimating review and documentation tool for contractors and estimating professionals. We don't adjust claims, represent policyholders, negotiate settlements, or interpret insurance policies — Florida law reserves that for licensed public adjusters, and we stay out of it entirely.",
  },
  {
    q: "Does Vault guarantee it will catch everything, or that I'll get paid more?",
    a: "No. Vault flags potential scope gaps based on the documentation you upload — it does not determine coverage, guarantee payment or a supplement, or replace your own professional judgment. Every finding is marked with a confidence level and needs your review and verification before it goes anywhere.",
  },
  {
    q: "What exactly is in the Vault?",
    a: "A maintained reference of line items that commonly get missed or under-scoped on Florida property estimates — roofing, water mitigation, mold, interior, exterior, general conditions, and code upgrades — each with an Xactimate code, a Florida Building Code citation where applicable, and a typical South Florida price range.",
  },
  {
    q: "Do the generated documents argue coverage or policy language?",
    a: "No. Every document is written from you, the contractor, about your scope of work and your pricing — never on behalf of a client, never arguing what a policy covers. It's your documentation of what the job requires and what it costs.",
  },
  {
    q: "Can my whole crew use one account?",
    a: "Yes, on the Crew plan. One subscription covers up to 5 users under the same company, with shared access to projects and the ability to invite teammates by email.",
  },
  {
    q: "Do I need Xactimate to use this?",
    a: "No. Vault references the Xactimate code where applicable so you can look up or cross-check items in your own estimating software, but you don't need Xactimate open to run a review or generate documentation.",
  },
  {
    q: "What if a price range or code citation doesn't match my job?",
    a: "Every range is a typical South Florida starting point, not a quote — pricing varies by county, scope, and market conditions. Always verify the current code citation and confirm your own pricing before you rely on anything Vault surfaces.",
  },
];

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-navy-700/60 bg-gradient-to-b from-navy-900 to-navy-950">
        <div className="container-vault flex flex-col items-center gap-8 py-20 text-center sm:py-28">
          <img
            src={beeyondLogo}
            alt="Beeyond"
            className="w-[clamp(220px,52vw,320px)] drop-shadow-[0_0_40px_rgba(212,175,55,0.25)]"
          />
          <span className="rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-gold-500">
            Built for Florida contractors, public adjusters, roofers, water restoration, mold
            remediation &amp; remodeling
          </span>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-white sm:text-6xl">
            Before You Send the Estimate, Run It Through Vault.
          </h1>
          <p className="max-w-xl text-lg text-white/70 sm:text-xl">
            Upload your estimate and supporting documentation. Beeyond Vault identifies potential
            scope gaps worth reviewing — so you can catch overlooked work before the estimate goes
            out.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button to="/pricing" className="text-lg">
              Run My First Review
            </Button>
            <Button href="#features" variant="secondary" className="text-lg">
              See How It Works
            </Button>
          </div>
          <p className="text-sm text-white/40">Card required for trial · Cancel anytime</p>
        </div>
      </section>

      {/* Pain section */}
      <section className="container-vault py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Most estimating mistakes aren't dramatic.
          </h2>
          <p className="mt-4 text-white/60">
            They're the small things that get missed — not big errors, just easy oversights when
            you're moving fast between jobs.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {PAIN_EXAMPLES.map((ex) => (
            <Card key={ex.title} className="flex items-start gap-4">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold-500/40 bg-gold-500/10 text-gold-500"
                aria-hidden="true"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-7-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l2.828 2.829a1 1 0 1 0 1.415-1.415L11 9.586V6Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <div>
                <h3 className="font-bold text-white">{ex.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{ex.body}</p>
              </div>
            </Card>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-lg text-center text-sm text-white/50">
          Find potential scope gaps before they become missed revenue.
        </p>
      </section>

      {/* Feature walkthrough */}
      <section id="features" className="border-y border-navy-700/60 bg-navy-900/60 py-20">
        <div className="container-vault">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              A second set of eyes for your estimate
            </h2>
          </div>

          <div className="mt-16 space-y-20">
            {FEATURES.map((f, i) => (
              <div
                key={f.label}
                className={`grid items-center gap-10 md:grid-cols-2 ${
                  i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-gold-500">
                    {f.label}
                  </span>
                  <h3 className="mt-2 text-2xl font-extrabold text-white">{f.title}</h3>
                  <p className="mt-4 text-white/70">{f.body}</p>
                </div>
                <ScreenshotPlaceholder label={f.label} />
              </div>
            ))}
          </div>

          <p className="mx-auto mt-16 max-w-2xl rounded-2xl border border-navy-700/60 bg-navy-950/60 p-5 text-center text-sm leading-relaxed text-white/50">
            Vault provides reference and documentation assistance only. Findings require
            professional review and verification. Vault does not determine coverage, payment, or
            claim outcome.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container-vault py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">Simple pricing</h2>
          <p className="mt-4 text-white/60">
            7-day free trial on every plan. No free tier inside the app — the Scope Checker is
            free forever, separately.
          </p>
        </div>
        <div className="mt-12">
          <PricingTable />
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-navy-700/60 bg-navy-900/60 py-20">
        <div className="container-vault">
          <h2 className="text-center text-3xl font-extrabold text-white sm:text-4xl">
            Questions
          </h2>
          <div className="mx-auto mt-12 max-w-2xl">
            <Accordion items={FAQ} />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container-vault py-20 text-center">
        <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
          Before you send it, run it through Vault.
        </h2>
        <div className="mt-8">
          <Button to="/pricing" className="text-lg">
            Run My First Review
          </Button>
        </div>
      </section>
    </div>
  );
}
