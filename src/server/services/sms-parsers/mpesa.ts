import { TransactionType } from "@prisma/client";
import { classifyByKeywords, extractAmount, extractPhone, extractReference, finalizeParsedSms, getActionableType, getNonActionableWarnings } from "./helpers";
import type { SmsParserModule } from "./types";

const typeMatchers: Array<{ type: TransactionType; patterns: RegExp[] }> = [
  { type: "DEPOSIT", patterns: [/umepokea/i, /cash\s?in/i, /wakala cash in/i, /received/i, /umepokea fedha/i] },
  { type: "WITHDRAWAL", patterns: [/cash\s?out/i, /withdraw/i, /umetoa/i, /umetoa fedha/i] },
  { type: "FLOAT_PURCHASE", patterns: [/float/i, /top\s?up/i, /ongeza float/i] },
  { type: "BILL_PAYMENT", patterns: [/bill payment/i, /control number/i, /malipo ya bili/i] },
  { type: "MERCHANT_PAYMENT", patterns: [/lipa/i, /merchant/i] },
  { type: "TRANSFER", patterns: [/transfer/i, /send money/i, /umetuma/i, /kutuma/i] },
];

export const mpesaParser: SmsParserModule = {
  provider: "MPESA",
  matches(message, sender) {
    return /m-?pesa|vodacom|mpesa|mpesa tz/i.test(`${sender ?? ""} ${message}`);
  },
  parse(message) {
    const type = getActionableType(message, classifyByKeywords(message, typeMatchers));
    const amount = extractAmount(message);
    const reference = extractReference(message, [
      /\b([A-Z]{1,4}[0-9][A-Z0-9]{5,9})\b/,
      /(?:kumbukumbu|receipt|\bref\b)[:#\s-]*([A-Z0-9-]{8,})/i,
    ]);
    const customerPhone = extractPhone(message);

    return finalizeParsedSms({
      provider: "MPESA",
      type,
      amount,
      reference,
      customerPhone,
      warnings: [
        ...(type ? [] : ["Transaction type inferred weakly for M-Pesa message"]),
        ...getNonActionableWarnings(message),
      ],
      minimumConfidence: 0.6,
    });
  },
};
