import { TransactionType } from "@prisma/client";
import { classifyByKeywords, extractAmount, extractPhone, extractReference, finalizeParsedSms, getActionableType, getNonActionableWarnings } from "./helpers";
import type { SmsParserModule } from "./types";

const typeMatchers: Array<{ type: TransactionType; patterns: RegExp[] }> = [
  { type: "DEPOSIT", patterns: [/mixx.*received/i, /deposit/i, /cash\s?in/i, /umepokea/i] },
  { type: "WITHDRAWAL", patterns: [/withdraw/i, /cash\s?out/i, /umetoa/i] },
  { type: "FLOAT_PURCHASE", patterns: [/float/i, /top\s?up/i, /ongeza float/i] },
  { type: "TRANSFER", patterns: [/transfer/i, /send money/i, /umetuma/i] },
  { type: "BILL_PAYMENT", patterns: [/bill payment/i, /control number/i, /malipo ya bili/i] },
  { type: "MERCHANT_PAYMENT", patterns: [/merchant/i, /lipa/i] },
];

export const mixxByYasParser: SmsParserModule = {
  provider: "MIXX_BY_YAS",
  matches(message, sender) {
    return /mixx|yas|mixx by yas|tigo\s?pesa|yas money/i.test(`${sender ?? ""} ${message}`);
  },
  parse(message) {
    const type = getActionableType(message, classifyByKeywords(message, typeMatchers));
    const amount = extractAmount(message);
    const reference = extractReference(message, [
      /(?:txn id|receipt|ref|kumbukumbu)[:#\s-]*([A-Z0-9-]{8,})/i,
      /^([A-Z0-9]{8,12})\s/i,
    ]);
    const customerPhone = extractPhone(message);

    return finalizeParsedSms({
      provider: "MIXX_BY_YAS",
      type,
      amount,
      reference,
      customerPhone,
      warnings: [
        ...(type ? [] : ["Transaction type inferred weakly for Mixx by Yas message"]),
        ...getNonActionableWarnings(message),
      ],
      minimumConfidence: 0.6,
    });
  },
};
