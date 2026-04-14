import { TransactionType } from "@prisma/client";
import { classifyByKeywords, extractAmount, extractPhone, extractReference, finalizeParsedSms, getActionableType, getNonActionableWarnings } from "./helpers";
import type { SmsParserModule } from "./types";

const typeMatchers: Array<{ type: TransactionType; patterns: RegExp[] }> = [
  { type: "BANK_DEPOSIT", patterns: [/cash deposit/i, /deposit confirmed/i, /fedha zimewekwa/i, /ameweka fedha/i] },
  { type: "BANK_WITHDRAWAL", patterns: [/cash withdrawal/i, /withdrawal confirmed/i, /fedha zimetolewa/i, /umetoa fedha/i] },
  { type: "TRANSFER", patterns: [/fund transfer/i, /transfer successful/i, /uhamisho wa fedha/i] },
];

export const nmbParser: SmsParserModule = {
  provider: "NMB_BANK",
  matches(message, sender) {
    return /\bnmb\b|nmb alerts|nmb bank|nmb huduma/i.test(`${sender ?? ""} ${message}`);
  },
  parse(message) {
    const type = getActionableType(message, classifyByKeywords(message, typeMatchers));
    const reference = extractReference(message, [
      /(?:reference|ref no|transaction id|receipt)[:#\s-]*([A-Z0-9-]{8,})/i,
      /^([A-Z0-9]{8,12})\s/i,
    ]);

    return finalizeParsedSms({
      provider: "NMB_BANK",
      type,
      amount: extractAmount(message),
      reference,
      customerPhone: extractPhone(message),
      warnings: [
        ...(type ? [] : ["NMB transaction type required fallback inference"]),
        ...getNonActionableWarnings(message),
      ],
      minimumConfidence: 0.72,
    });
  },
};
