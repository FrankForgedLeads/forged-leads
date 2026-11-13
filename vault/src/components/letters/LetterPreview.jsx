import { buildLetterParagraphs } from "../../lib/letters/templates.js";
import { formatCurrency } from "../../lib/format.js";
import { VAULT_DISCLAIMER } from "../../lib/disclaimer.js";

export default function LetterPreview({ templateKey, fields, itemRows, total }) {
  const { opening, afterItems, closing } = buildLetterParagraphs(templateKey, { ...fields, total });

  return (
    <div className="rounded-2xl bg-[#f5f2ea] p-6 text-[#1a1a1a] shadow-2xl sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold">{fields.companyName || "Your Company"}</p>
          {fields.contactName && <p className="text-sm">{fields.contactName}</p>}
          {fields.contactPhone && <p className="text-sm">{fields.contactPhone}</p>}
          {fields.contactEmail && <p className="text-sm">{fields.contactEmail}</p>}
        </div>
        <p className="text-sm text-black/60">{fields.letterDate}</p>
      </div>

      {(fields.carrier || fields.adjusterName) && (
        <p className="mt-6 text-sm font-bold">
          {fields.carrier}
          {fields.adjusterName && (
            <>
              <br />
              Attn: {fields.adjusterName}
            </>
          )}
        </p>
      )}

      {(fields.claimNumber || fields.insuredName || fields.propertyAddress || fields.dateOfLoss) && (
        <p className="mt-3 text-sm">
          Re:{" "}
          {[
            fields.claimNumber && `Claim #${fields.claimNumber}`,
            fields.insuredName && `Insured: ${fields.insuredName}`,
            fields.propertyAddress && `Property: ${fields.propertyAddress}`,
            fields.dateOfLoss && `Date of Loss: ${fields.dateOfLoss}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      <p className="mt-6 text-sm">
        {fields.adjusterName ? `Dear ${fields.adjusterName},` : "To Whom It May Concern,"}
      </p>

      {opening.map((p) => (
        <p key={p} className="mt-4 text-sm leading-relaxed">
          {p}
        </p>
      ))}

      <div className="mt-5 space-y-4">
        {itemRows.map((row, i) => (
          <div key={i} className="flex items-start justify-between gap-4 text-sm">
            <div>
              <p className="font-semibold">
                {i + 1}. {row.title}
                {(row.code || row.citation) && (
                  <span className="font-normal text-black/60">
                    {" "}
                    ({[row.code, row.citation].filter(Boolean).join(" · ")})
                  </span>
                )}
              </p>
              <p className="text-xs text-black/60">
                Qty: {row.quantity} {row.unit} × {formatCurrency(row.unitAmount)}/{row.unit || "unit"}
                {row.note ? ` — ${row.note}` : ""}
              </p>
            </div>
            <p className="shrink-0 font-semibold">{formatCurrency(row.lineTotal)}</p>
          </div>
        ))}
      </div>

      {afterItems.map((p) => (
        <p key={p} className="mt-5 text-sm font-semibold leading-relaxed">
          {p}
        </p>
      ))}

      {fields.additionalNote && (
        <p className="mt-4 text-sm leading-relaxed">{fields.additionalNote}</p>
      )}

      {closing.map((p) => (
        <p key={p} className="mt-4 text-sm leading-relaxed">
          {p}
        </p>
      ))}

      <p className="mt-8 text-sm">Sincerely,</p>
      <p className="mt-5 text-sm">
        {fields.contactName}
        {fields.contactName && <br />}
        {fields.companyName}
        {fields.companyName && <br />}
        {fields.contactPhone}
        {fields.contactPhone && <br />}
        {fields.contactEmail}
      </p>

      <p className="mt-10 border-t border-black/10 pt-3 text-[10px] leading-relaxed text-black/50">
        {VAULT_DISCLAIMER}
      </p>
    </div>
  );
}
