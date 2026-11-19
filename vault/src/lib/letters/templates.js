import { formatCurrency } from "../format.js";

// ============================================================================
// Legal guardrail (non-negotiable, see product spec):
// Every letter is written FROM the contractor TO the carrier, about the
// CONTRACTOR'S OWN scope of work and pricing. Never "on behalf of the
// insured." Never argue coverage or policy language. "Our scope of work
// requires X per FBC Y, priced at Z" — fine. "The insured is owed" — not
// fine. Every template ends with a line inviting the adjuster to contact
// the contractor to reconcile the estimate. Keep that framing if you edit
// this file.
// ============================================================================

export const LETTER_TEMPLATES = [
  {
    key: "initial_scope_clarification",
    name: "Initial scope clarification",
    description: "First letter identifying items missing from the carrier's estimate.",
  },
  {
    key: "follow_up_no_response",
    name: "Follow-up after no response",
    description: "Resubmits your scope of work after the carrier has gone quiet.",
  },
  {
    key: "response_to_partial_approval",
    name: "Response to partial approval",
    description: "Addresses items left out of a partial approval.",
  },
];

export function letterTemplateName(key) {
  return LETTER_TEMPLATES.find((t) => t.key === key)?.name ?? key;
}

/**
 * Returns the letter body as three arrays of paragraph strings: `opening`
 * (before the itemized list), `afterItems` (right after it, states the
 * total), and `closing` (always ends with the reconcile-by-contact line).
 */
export function buildLetterParagraphs(templateKey, fields) {
  const total = formatCurrency(fields.total);
  const contact = [fields.contactPhone, fields.contactEmail].filter(Boolean).join(" or ");
  const contactLine = contact
    ? `Please contact us at ${contact} so we can reconcile our scope of work with your estimate.`
    : "Please contact us so we can reconcile our scope of work with your estimate.";

  if (templateKey === "follow_up_no_response") {
    return {
      opening: [
        `On ${fields.originalDate || "the date noted above"}, we submitted our scope of work for the repairs at the above-referenced property, identifying items required to complete the repair in accordance with the Florida Building Code and/or manufacturer and industry installation standards. As of the date of this letter, we have not received a response.`,
        "For your reference, we are resubmitting our scope of work below:",
      ],
      afterItems: [`These items bring the total cost of our scope of work to ${total}.`],
      closing: [contactLine, "We appreciate your prompt attention to this matter."],
    };
  }

  if (templateKey === "response_to_partial_approval") {
    const approvedLine = fields.approvedAmount
      ? ` Your estimate reflects an approved amount of ${formatCurrency(fields.approvedAmount)}.`
      : "";
    return {
      opening: [
        `We have received your estimate reflecting a partial approval for the repairs at the above-referenced property.${approvedLine} The following items from our scope of work were not included and remain required to complete the repair in accordance with the Florida Building Code and/or manufacturer and industry installation standards.`,
        "Our pricing for these items, based on current South Florida market rates, is itemized below:",
      ],
      afterItems: [`These items bring the total cost of our full scope of work to ${total}.`],
      closing: [contactLine, "We appreciate your attention to this matter."],
    };
  }

  // Default: initial_scope_clarification
  return {
    opening: [
      "This letter is to clarify our scope of work for the repairs at the above-referenced property. As the contractor performing this work, we have identified the following items that are required to complete the repair in accordance with the Florida Building Code and/or manufacturer and industry installation standards, and are not currently reflected in the estimate we received.",
      "The items below, along with our pricing for each based on current South Florida market rates, are itemized as follows:",
    ],
    afterItems: [
      `The items above bring the total cost of our scope of work to ${total}. We ask that you review this scope and pricing against your estimate.`,
    ],
    closing: [contactLine, "We appreciate your attention to this matter."],
  };
}
