export function daysLeftInTrial(trialEndsAt) {
  if (!trialEndsAt) return null;
  return Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export const STATUS_LABELS = {
  trialing: "Trial",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
  incomplete_expired: "Incomplete (expired)",
};

export function subscriptionStatusLabel(status) {
  return STATUS_LABELS[status] || "No subscription";
}
