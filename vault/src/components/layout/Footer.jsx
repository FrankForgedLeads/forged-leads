import { Link } from "react-router-dom";
import Logo from "../ui/Logo.jsx";

export default function Footer() {
  return (
    <footer className="border-t border-navy-700/60 bg-navy-900">
      <div className="container-vault py-12">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-sm text-white/60">
              A product of Beeyond LLC, sub-brand of{" "}
              <a
                href="https://beeyondestimators.com"
                className="underline decoration-white/30 hover:text-white"
              >
                Beeyond Estimators
              </a>
              . Built for Florida roofers, restoration contractors, and public adjusters.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h4 className="text-sm font-bold text-white">Product</h4>
              <ul className="mt-3 space-y-2 text-sm text-white/60">
                <li>
                  <Link to="/pricing" className="hover:text-white">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link to="/scope-checker" className="hover:text-white">
                    Scope Checker
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white">
                    Log in
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Legal</h4>
              <ul className="mt-3 space-y-2 text-sm text-white/60">
                <li>
                  <Link to="/terms" className="hover:text-white">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Contact</h4>
              <ul className="mt-3 space-y-2 text-sm text-white/60">
                <li>
                  <a href="mailto:leads@beeyondestimators.com" className="hover:text-white">
                    leads@beeyondestimators.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-navy-700/60 pt-6">
          <p className="text-xs leading-relaxed text-white/45">
            Beeyond Vault is a reference tool for contractors. It is not a public adjuster, does
            not represent policyholders, and does not provide legal advice. Verify all codes and
            amounts before submitting.
          </p>
          <p className="mt-3 text-xs text-white/35">
            &copy; {new Date().getFullYear()} Beeyond LLC. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
