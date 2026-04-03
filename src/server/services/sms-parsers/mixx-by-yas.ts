import { SmsProvider, TransactionType } from "@prisma/client";
import { classifyByKeywords, extractAmount, extractPhone, extractReference, finalizeParsedSms } from "./helpers";
import type { SmsParserModule } from "./types";

const typeMatchers: Array<{ type: TransactionType; patterns: RegExp[] }> = [
  { type: "DEPOSIT", patterns: [/mixx.*received/i, /deposit/i, /cash\s?in/i] },
  { type: "WITHDRAWAL", patterns: [/withdraw/i, /cash\s?out/i] },
  { type: "FLOAT_PURCHASE", patterns: [/float/i, /top\s?up/i] },
  { type: "TRANSFER", patterns: [/transfer/i, /send money/i] },
  { type: "BILL_PAYMENT", patterns: [/bill payment/i, /control number/i] },
  { type: "MERCHANT_PAYMENT", patterns: [/merchant/i, /lipa/i] },
];

export const mixxByYasParser: SmsParserModule = {
  provider: "MIXX_BY_YAS",
  matches(message, sender) {
    return /mixx|yas|tigo\s?pesa/i.test(`${sender ?? ""} ${message}`);
  },
  parse(message) {
    const type = classifyByKeywords(message, typeMatchers);
    const amount = extractAmount(message);
    const reference = extractReference(message, [
      /(?:txn id|receipt|ref|kumbukumbu)[:#\s-]*([A-Z0-9-]{8,})/i,
      /^([A-Z0-9]{8,12})\s/i,
    ]);
    const customerPhone = extractPhone(message);

    return finalizeParsedSms({
      provider: SmsProvider.MIXX_BY_YAS,
      type,
      amount,
      reference,
      customerPhone,
      warnings: type ? [] : ["Transaction type inferred weakly for Mixx by Yas message"],
      minimumConfidence: 0.6,
    });
  },
};
