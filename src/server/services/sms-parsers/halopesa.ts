import { SmsProvider, TransactionType } from "@prisma/client";
import { classifyByKeywords, extractAmount, extractPhone, extractReference, finalizeParsedSms } from "./helpers";
import type { SmsParserModule } from "./types";

const typeMatchers: Array<{ type: TransactionType; patterns: RegExp[] }> = [
  { type: "DEPOSIT", patterns: [/halopesa.*received/i, /deposit/i, /cash\s?in/i] },
  { type: "WITHDRAWAL", patterns: [/withdraw/i, /cash\s?out/i] },
  { type: "FLOAT_PURCHASE", patterns: [/float/i, /top\s?up/i] },
  { type: "TRANSFER", patterns: [/transfer/i, /send money/i] },
];

export const halopesaParser: SmsParserModule = {
  provider: "HALOPESA",
  matches(message, sender) {
    return /halopesa|halotel/i.test(`${sender ?? ""} ${message}`);
  },
  parse(message) {
    return finalizeParsedSms({
      provider: SmsProvider.HALOPESA,
      type: classifyByKeywords(message, typeMatchers),
      amount: extractAmount(message),
      reference: extractReference(message),
      customerPhone: extractPhone(message),
      warnings: ["Halopesa parser is scaffolded and should be tightened with real fixtures"],
      minimumConfidence: 0.6,
    });
  },
};
