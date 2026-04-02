import { SmsProvider, TransactionType } from "@prisma/client";
import { classifyByKeywords, extractAmount, extractPhone, extractReference, finalizeParsedSms } from "./helpers";
import type { SmsParserModule } from "./types";

const typeMatchers: Array<{ type: TransactionType; patterns: RegExp[] }> = [
  { type: "BANK_DEPOSIT", patterns: [/deposit/i, /cash deposit/i] },
  { type: "BANK_WITHDRAWAL", patterns: [/withdraw/i, /cash withdrawal/i] },
  { type: "TRANSFER", patterns: [/transfer/i] },
];

export const nmbParser: SmsParserModule = {
  provider: "NMB_BANK",
  matches(message, sender) {
    return /\bnmb\b/i.test(`${sender ?? ""} ${message}`);
  },
  parse(message) {
    return finalizeParsedSms({
      provider: SmsProvider.NMB_BANK,
      type: classifyByKeywords(message, typeMatchers),
      amount: extractAmount(message),
      reference: extractReference(message),
      customerPhone: extractPhone(message),
      warnings: ["NMB parser is scaffolded and should be tightened with real fixtures"],
      minimumConfidence: 0.6,
    });
  },
};
