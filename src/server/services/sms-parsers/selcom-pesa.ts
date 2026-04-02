import { SmsProvider, TransactionType } from "@prisma/client";
import { classifyByKeywords, extractAmount, extractPhone, extractReference, finalizeParsedSms } from "./helpers";
import type { SmsParserModule } from "./types";

const typeMatchers: Array<{ type: TransactionType; patterns: RegExp[] }> = [
  { type: "DEPOSIT", patterns: [/selcom.*received/i, /deposit/i, /cash\s?in/i] },
  { type: "WITHDRAWAL", patterns: [/withdraw/i, /cash\s?out/i] },
  { type: "TRANSFER", patterns: [/transfer/i] },
  { type: "BILL_PAYMENT", patterns: [/bill payment/i] },
];

export const selcomPesaParser: SmsParserModule = {
  provider: "SELCOM_PESA",
  matches(message, sender) {
    return /selcom/i.test(`${sender ?? ""} ${message}`);
  },
  parse(message) {
    return finalizeParsedSms({
      provider: SmsProvider.SELCOM_PESA,
      type: classifyByKeywords(message, typeMatchers),
      amount: extractAmount(message),
      reference: extractReference(message),
      customerPhone: extractPhone(message),
      warnings: ["Selcom Pesa parser is scaffolded and should be tightened with real fixtures"],
      minimumConfidence: 0.6,
    });
  },
};
