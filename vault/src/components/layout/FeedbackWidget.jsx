import { useState } from "react";
import { useLocation } from "react-router-dom";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import { Textarea } from "../ui/Field.jsx";
import { submitFeedback } from "../../lib/api/feedback.js";
import { useAuth } from "../../lib/AuthContext.jsx";

// Persistent, low-friction feedback capture — product spec's Admin section
// calls for "View customer feedback" and there was previously no way for
// one to reach Frankie except a support email he'd have to think to check.
// Deliberately just a free-text box, no rating/NPS/category picker: the
// whole point is minimal friction for a contractor who's mid-job, not a
// structured survey.
//
// Lives in the header action row (next to Log out), not a `fixed` floating
// corner button — mobile audit caught the floating version overlapping
// ClaimDetail's own sticky bottom total/CTA bar at narrower widths (its
// Export Review Summary + Generate letter buttons wrap to a tall enough
// stack at 320px to collide with a bottom-right fixed element). The header
// never competes with a page's own bottom content, so it's not just a fix
// for this one page — it rules out the same class of collision on any
// future page with its own sticky footer, without needing per-page
// coordination.
export default function FeedbackWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sentOk, setSentOk] = useState(false);

  function close() {
    setOpen(false);
    // Reset after the close animation would run if there were one — no
    // point keeping a submitted/errored form's leftover state around for
    // next time this opens.
    setTimeout(() => {
      setMessage("");
      setError("");
      setSentOk(false);
    }, 200);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await submitFeedback({ userId: user.id, message: message.trim(), pageContext: location.pathname });
      setSentOk(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto shrink-0 rounded-lg border border-navy-600 px-4 py-2 text-sm font-bold text-white/70 transition hover:bg-navy-800 hover:text-white"
      >
        Feedback
      </button>

      <Modal open={open} onClose={close} title="Send feedback">
        {sentOk ? (
          <div className="py-2">
            <p className="font-semibold text-gold-500">Thanks — this goes straight to the team.</p>
            <Button as="button" type="button" variant="secondary" onClick={close} className="mt-5 w-full">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-sm text-white/60">
              What's working, what's not, what you wish the Vault did — anything's useful.
            </p>
            <Textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's on your mind…"
              className="mt-3"
              autoFocus
            />
            {error && <p className="mt-2 text-sm font-semibold text-red-400">{error}</p>}
            <Button
              as="button"
              type="submit"
              disabled={submitting || !message.trim()}
              className="mt-4 w-full"
            >
              {submitting ? "Sending…" : "Send feedback"}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}
