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
