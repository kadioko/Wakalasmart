import { SmsProvider, TransactionType } from "@prisma/client";
import { classifyByKeywords, extractAmount, extractPhone, extractReference, finalizeParsedSms } from "./helpers";
import type { SmsParserModule } from "./types";

const typeMatchers: Array<{ type: TransactionType; patterns: RegExp[] }> = [
  { type: "BANK_DEPOSIT", patterns: [/cash deposit/i, /deposit confirmed/i, /ameweka fedha/i] },
  { type: "BANK_WITHDRAWAL", patterns: [/cash withdrawal/i, /withdrawal confirmed/i, /umetoa fedha/i] },
  { type: "TRANSFER", patterns: [/funds transfer/i, /transfer successful/i] },
];

export const crdbParser: SmsParserModule = {
  provider: "CRDB_BANK",
  matches(message, sender) {
    return /crdb|crdbbank|crdb biashara/i.test(`${sender ?? ""} ${message}`);
  },
  parse(message) {
    const type = classifyByKeywords(message, typeMatchers);
    const reference = extractReference(message, [
      /(?:reference|ref no|transaction id|receipt)[:#\s-]*([A-Z0-9-]{8,})/i,
      /^([A-Z0-9]{8,12})\s/i,
    ]);

    return finalizeParsedSms({
      provider: SmsProvider.CRDB_BANK,
      type,
      amount: extractAmount(message),
      reference,
      customerPhone: extractPhone(message),
      warnings: type ? [] : ["CRDB transaction type required fallback inference"],
      minimumConfidence: 0.72,
    });
  },
};
