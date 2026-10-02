import LegalLayout from "../components/layout/LegalLayout.jsx";

const S = ({ title, children }) => (
  <section>
    <h2 className="text-xl font-bold text-white">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-relaxed">{children}</div>
  </section>
);

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="Draft — pending legal review">
      <p className="text-sm leading-relaxed">
        This is a plain-English draft prepared for Beeyond LLC's internal review. It is not final
        and has not been reviewed by an attorney. Do not treat it as a finished legal document.
      </p>

      <S title="1. What we collect">
        <p>When you use Beeyond Vault, we collect:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-white">Account info:</strong> name, email, company, phone,
            role, and password-free login via magic link,
          </li>
          <li>
            <strong className="text-white">Claim data:</strong> claim numbers, insured names,
            property addresses, carrier and adjuster names, and the items and notes you attach —
            this is your own working data, entered by you,
          </li>
          <li>
            <strong className="text-white">Billing info:</strong> handled directly by Stripe — we
            never see or store your full card number,
          </li>
          <li>
            <strong className="text-white">Scope Checker leads:</strong> name, email, phone, and
            company if you use the free Scope Checker tool, and
          </li>
          <li>
            <strong className="text-white">Basic usage data</strong> via privacy-friendly,
            cookie-free analytics (no Google Analytics, no cross-site tracking).
          </li>
        </ul>
      </S>

      <S title="2. How we use it">
        <ul className="list-disc space-y-1 pl-5">
          <li>To run your account, your claims, and your subscription,</li>
          <li>To send transactional emails (magic-link login, receipts, letter exports),</li>
          <li>To send the monthly Vault update email to active subscribers,</li>
          <li>To follow up with leads from the free Scope Checker, and</li>
          <li>To improve the Service.</li>
        </ul>
        <p>We do not sell your data. We do not share claim data with insurance carriers.</p>
      </S>

      <S title="3. Who we share it with">
        <p>We use a small set of service providers to run Beeyond Vault:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-white">Supabase</strong> — database and authentication,
          </li>
          <li>
            <strong className="text-white">Stripe</strong> — subscription billing,
          </li>
          <li>
            <strong className="text-white">Netlify</strong> — hosting,
          </li>
          <li>
            <strong className="text-white">Resend</strong> — transactional and update email, and
          </li>
          <li>
            <strong className="text-white">Plausible / Netlify Analytics</strong> — anonymous,
            cookie-free site analytics.
          </li>
        </ul>
        <p>
          Each of these providers processes data on our behalf under their own security and
          privacy practices. We don't share your data with anyone else except as required by law.
        </p>
      </S>

      <S title="4. Data retention">
        <p>
          We keep your account and claim data for as long as your account is active, plus a
          reasonable period after cancellation in case you resubscribe. You can request full
          deletion of your account and data at any time.
        </p>
      </S>

      <S title="5. Your rights">
        <p>
          You can access, correct, export, or delete your data by emailing us. If you're a
          Florida resident, you have rights under Florida law regarding your personal data;
          contact us to exercise them.
        </p>
      </S>

      <S title="6. Security">
        <p>
          Data is stored with Supabase (Postgres with row-level security) and encrypted in
          transit. No system is 100% secure, but we follow standard practices to protect your
          information.
        </p>
      </S>

      <S title="7. Children">
        <p>Beeyond Vault is a business tool and is not directed to anyone under 18.</p>
      </S>

      <S title="8. Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will be communicated by
          email or in-app notice.
        </p>
      </S>

      <S title="9. Contact">
        <p>
          Questions about this policy or your data:{" "}
          <a href="mailto:leads@beeyondestimators.com" className="text-gold-500 underline">
            leads@beeyondestimators.com
          </a>
        </p>
      </S>
    </LegalLayout>
  );
}
