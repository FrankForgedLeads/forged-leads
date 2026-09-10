import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Accordion from "../components/ui/Accordion.jsx";
import ScreenshotPlaceholder from "../components/ui/ScreenshotPlaceholder.jsx";
import PricingTable from "../components/PricingTable.jsx";
import beeyondLogo from "../assets/beeyond-logo.webp";

const PAIN_EXAMPLES = [
  {
    title: "Drip edge, left off entirely",
    code: "FBC R905.2.8.5 · Xactimate RFG DRIP",
    body: "Adjuster estimate has tear-off and shingles but no drip edge line item. It's required at every eave and rake by code. On a 30-square roof that's $600–$1,200 walked away from before you even start.",
  },
  {
    title: "Secondary water barrier, priced as \"included\"",
    code: "FBC R905.1.2 · HVHZ underlayment rules",
    body: "Self-adhered underlayment or the sealed-deck method gets bundled into a generic \"felt\" line at a fraction of real cost — or skipped entirely in HVHZ counties where it's mandatory.",
  },
  {
    title: "No steep or high charge on a 9/12, 2-story roof",
    code: "Xactimate steep (7/12+) and high (2+ stories) charges",
    body: "The pitch and height are right there in the adjuster's own measurements. The labor multiplier for working that roof safely is real — and it's missing from the estimate almost every time.",
  },
];

const FEATURES = [
  {
    label: "The Vault",
    title: "Every line item adjusters leave off, searchable in seconds",
    body: "Search by keyword, code, or category. Every item ships with the Xactimate code, the Florida Building Code citation, a typical South Florida price range, and a plain-English note on why it's owed. No more digging through the code book on a job site.",
  },
  {
    label: "Claims",
    title: "One place for every claim you're working",
    body: "Save unlimited claims. Attach missing items as you find them. Watch the running total build in real time so you walk into every conversation with a number, not a feeling.",
  },
  {
    label: "Letters",
    title: "A scope-dispute letter in under two minutes",
    body: "Pick a template, and it auto-fills with your claim and item data — code citations included. Export a clean PDF with your company block at the top and send it the same day.",
  },
];

const FAQ = [
  {
    q: "Is Beeyond Vault a public adjusting service?",
    a: "No. Beeyond Vault is a reference and document-preparation tool for contractors preparing their own scope of work. We don't adjust claims, represent policyholders, or negotiate settlements — Florida law reserves that for licensed public adjusters, and we stay out of it entirely.",
  },
  {
    q: "What exactly is in the Vault?",
    a: "A searchable database of line items that commonly get left off Florida property insurance estimates — roofing, water mitigation, mold, interior, exterior, general conditions, and code upgrades — each with an Xactimate code, a Florida Building Code citation, a typical South Florida price range, and a plain-English explanation of why it's owed.",
  },
  {
    q: "Do the letters argue coverage or policy language?",
    a: "No. Every letter is written from you, the contractor, to the carrier about your scope of work and your pricing — never on behalf of the insured, never arguing what the policy covers. It's your documentation of what the job requires and what it costs.",
  },
  {
    q: "Can my whole crew use one account?",
    a: "Yes, on the Crew plan. One subscription covers up to 5 users under the same company, with shared access to claims and the ability to invite teammates by email.",
  },
  {
    q: "Do I need Xactimate to use this?",
    a: "No. The Vault gives you the Xactimate code as a reference so you can look up or cross-check items in your own estimating software, but you don't need Xactimate open to search the Vault, build a claim, or generate a letter.",
  },
  {
    q: "What if a price range or code citation doesn't match my job?",
    a: "Every range is a typical South Florida starting point, not a quote — pricing varies by county, scope, and market conditions. Always verify the current code citation and confirm your own pricing before you submit anything to a carrier.",
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
            Built for Florida contractors, public adjusters, roofers, water restoration &amp; mold
            remediation
          </span>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-white sm:text-6xl">
            Everything the adjuster left off, in one place.
          </h1>
          <p className="max-w-xl text-lg text-white/70 sm:text-xl">
            Stop leaving money on the table. Search the line items adjusters commonly miss, cite
            the code, and document your scope in the time it takes to walk the roof.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button to="/pricing" className="text-lg">
              Start your 7-day free trial
            </Button>
            <Button to="/scope-checker" variant="secondary" className="text-lg">
              Try the free Scope Checker
            </Button>
          </div>
          <p className="text-sm text-white/40">Card required for trial · Cancel anytime</p>
        </div>
      </section>

      {/* Pain section */}
      <section className="container-vault py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            What you're leaving on the table
          </h2>
          <p className="mt-4 text-white/60">
            Three real examples of items that show up missing, underscoped, or "included" on
            Florida estimates — costing contractors real money every single week.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PAIN_EXAMPLES.map((ex) => (
            <Card key={ex.title}>
              <p className="text-xs font-bold uppercase tracking-wide text-gold-500">{ex.code}</p>
              <h3 className="mt-3 text-lg font-extrabold text-white">{ex.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70">{ex.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Feature walkthrough */}
      <section id="features" className="border-y border-navy-700/60 bg-navy-900/60 py-20">
        <div className="container-vault">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Everything you need to document your scope and get paid for it
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
          Document your scope. Cite the code. Get paid for the work you did.
        </h2>
        <div className="mt-8">
          <Button to="/pricing" className="text-lg">
            Start your 7-day free trial
          </Button>
        </div>
      </section>
    </div>
  );
}
