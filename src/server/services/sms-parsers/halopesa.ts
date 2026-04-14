import { TransactionType } from "@prisma/client";
import { classifyByKeywords, extractAmount, extractPhone, extractReference, finalizeParsedSms, getActionableType, getNonActionableWarnings } from "./helpers";
import type { SmsParserModule } from "./types";

const typeMatchers: Array<{ type: TransactionType; patterns: RegExp[] }> = [
  { type: "DEPOSIT", patterns: [/umepokea/i, /cash\s?in/i, /deposit confirmed/i, /umepokea fedha/i] },
  { type: "WITHDRAWAL", patterns: [/cash\s?out/i, /umetoa/i, /withdrawal confirmed/i, /umetoa fedha/i] },
  { type: "FLOAT_PURCHASE", patterns: [/float top up/i, /float purchase/i, /ongeza float/i] },
  { type: "TRANSFER", patterns: [/transfer confirmed/i, /send money/i, /umetuma/i] },
  { type: "BILL_PAYMENT", patterns: [/bill payment/i, /control number/i, /malipo ya bili/i] },
];

export const halopesaParser: SmsParserModule = {
  provider: "HALOPESA",
  matches(message, sender) {
    return /halopesa|halotel|halo\s?pesa|halo-pesa/i.test(`${sender ?? ""} ${message}`);
  },
  parse(message) {
    const type = getActionableType(message, classifyByKeywords(message, typeMatchers));
    const reference = extractReference(message, [
      /\b([A-Z]{1,4}[0-9][A-Z0-9]{5,9})\b/,
      /(?:kumbukumbu|muamala|receipt|\bref\b)[:#\s-]*([A-Z0-9-]{8,})/i,
    ]);

    return finalizeParsedSms({
      provider: "HALOPESA",
      type,
      amount: extractAmount(message),
      reference,
      customerPhone: extractPhone(message),
      warnings: [
        ...(type ? [] : ["Halopesa transaction type required fallback inference"]),
        ...getNonActionableWarnings(message),
      ],
      minimumConfidence: 0.72,
    });
  },
};
