import { SmsProvider, TransactionType } from "@prisma/client";
import { classifyByKeywords, extractAmount, extractPhone, extractReference, finalizeParsedSms } from "./helpers";
import type { SmsParserModule } from "./types";

const typeMatchers: Array<{ type: TransactionType; patterns: RegExp[] }> = [
  { type: "DEPOSIT", patterns: [/umepokea/i, /cash\s?in/i, /wakala cash in/i, /received/i] },
  { type: "WITHDRAWAL", patterns: [/cash\s?out/i, /withdraw/i, /umetoa/i] },
  { type: "FLOAT_PURCHASE", patterns: [/float/i, /top\s?up/i] },
  { type: "MERCHANT_PAYMENT", patterns: [/lipa/i, /merchant/i] },
  { type: "TRANSFER", patterns: [/transfer/i, /send money/i, /umetuma/i] },
];

export const mpesaParser: SmsParserModule = {
  provider: "MPESA",
  matches(message, sender) {
    return /m-?pesa|vodacom/i.test(`${sender ?? ""} ${message}`);
  },
  parse(message) {
    const type = classifyByKeywords(message, typeMatchers);
    const amount = extractAmount(message);
    const reference = extractReference(message, [
      /^([A-Z0-9]{10,12})\s/i,
      /(?:kumbukumbu|receipt|ref)[:#\s-]*([A-Z0-9-]{8,})/i,
    ]);
    const customerPhone = extractPhone(message);

    return finalizeParsedSms({
      provider: SmsProvider.MPESA,
      type,
      amount,
      reference,
      customerPhone,
      warnings: type ? [] : ["Transaction type inferred weakly for M-Pesa message"],
      minimumConfidence: 0.6,
    });
  },
};
