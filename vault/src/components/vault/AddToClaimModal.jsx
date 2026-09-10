import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import { Field, Input } from "../ui/Field.jsx";
import { fetchClaims, createClaim } from "../../lib/api/claims.js";
import { addClaimItem } from "../../lib/api/claimItems.js";
import { useAuth } from "../../lib/AuthContext.jsx";

export default function AddToClaimModal({ item, onClose, onAdded }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [newClaimNumber, setNewClaimNumber] = useState("");
  const [newInsuredName, setNewInsuredName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [addedTo, setAddedTo] = useState(null);

  useEffect(() => {
    let active = true;
    fetchClaims()
      .then((data) => {
        if (!active) return;
        setClaims(data);
        if (data.length === 0) setCreatingNew(true);
        else setSelectedClaimId(data[0].id);
      })
      .catch((e) => setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      let claimId = selectedClaimId;
      let claim = claims.find((c) => c.id === claimId);

      if (creatingNew) {
        claim = await createClaim(
          {
            claim_number: newClaimNumber.trim() || null,
            insured_name: newInsuredName.trim() || null,
          },
          user.id,
        );
        claimId = claim.id;
      }

      await addClaimItem({ claimId, itemId: item.id });
      setAddedTo(claim);
      onAdded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Add "${item.title}" to a claim`}>
      {addedTo ? (
        <div className="space-y-4">
          <p className="text-sm text-white/70">
            Added to{" "}
            <span className="font-bold text-white">
              {addedTo.claim_number || addedTo.insured_name || "your claim"}
            </span>
            .
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Keep browsing
            </Button>
            <Button onClick={() => navigate(`/claims/${addedTo.id}`)} className="flex-1">
              Go to claim
            </Button>
          </div>
        </div>
      ) : loading ? (
        <p className="text-sm text-white/60">Loading your claims…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {claims.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setCreatingNew(false)}
                className={`w-full rounded-xl border p-1 text-left transition ${
                  !creatingNew ? "border-gold-500" : "border-navy-600"
                }`}
              >
                <div className="max-h-48 space-y-1 overflow-y-auto p-2">
                  {claims.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-navy-700/50"
                    >
                      <input
                        type="radio"
                        name="claim"
                        checked={!creatingNew && selectedClaimId === c.id}
                        onChange={() => {
                          setCreatingNew(false);
                          setSelectedClaimId(c.id);
                        }}
                        className="h-4 w-4 accent-gold-500"
                      />
                      <span className="text-sm text-white">
                        {c.claim_number || c.insured_name || "Untitled claim"}
                        {c.claim_number && c.insured_name ? ` — ${c.insured_name}` : ""}
                      </span>
                    </label>
                  ))}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCreatingNew(true)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  creatingNew
                    ? "border-gold-500 text-white"
                    : "border-navy-600 text-white/70 hover:text-white"
                }`}
              >
                <input
                  type="radio"
                  name="claim"
                  checked={creatingNew}
                  onChange={() => setCreatingNew(true)}
                  className="h-4 w-4 accent-gold-500"
                />
                Create a new claim
              </button>
            </div>
          )}

          {creatingNew && (
            <div className="space-y-4 rounded-xl border border-navy-600 p-4">
              <Field label="Claim number (optional)">
                <Input
                  value={newClaimNumber}
                  onChange={(e) => setNewClaimNumber(e.target.value)}
                  placeholder="e.g. 24-0451"
                />
              </Field>
              <Field label="Insured name (optional)">
                <Input
                  value={newInsuredName}
                  onChange={(e) => setNewInsuredName(e.target.value)}
                  placeholder="e.g. John Smith"
                />
              </Field>
              <p className="text-xs text-white/40">
                You can fill in the rest of the claim details after — address, carrier, adjuster.
              </p>
            </div>
          )}

          {error && <p className="text-sm font-semibold text-red-400">{error}</p>}

          <Button as="button" type="submit" disabled={submitting} className="w-full">
            {submitting ? "Adding…" : "Add item"}
          </Button>
        </form>
      )}
    </Modal>
  );
}
