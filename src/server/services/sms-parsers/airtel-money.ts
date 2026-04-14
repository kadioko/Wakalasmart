import { TransactionType } from "@prisma/client";
import { classifyByKeywords, extractAmount, extractPhone, extractReference, finalizeParsedSms, getActionableType, getNonActionableWarnings } from "./helpers";
import type { SmsParserModule } from "./types";

const typeMatchers: Array<{ type: TransactionType; patterns: RegExp[] }> = [
  { type: "DEPOSIT", patterns: [/airtel money.*received/i, /cash\s?in/i, /deposit/i, /umepokea/i] },
  { type: "WITHDRAWAL", patterns: [/withdraw/i, /cash\s?out/i, /umetoa/i] },
  { type: "FLOAT_PURCHASE", patterns: [/float/i, /top\s?up/i, /ongeza float/i] },
  { type: "TRANSFER", patterns: [/transfer/i, /sent/i, /umetuma/i] },
  { type: "BILL_PAYMENT", patterns: [/bill payment/i, /control number/i, /malipo ya bili/i] },
];

export const airtelMoneyParser: SmsParserModule = {
  provider: "AIRTEL_MONEY",
  matches(message, sender) {
    return /airtel\s?money|airtelmoney|airtel tz|airtel/i.test(`${sender ?? ""} ${message}`);
  },
  parse(message) {
    const type = getActionableType(message, classifyByKeywords(message, typeMatchers));
    const amount = extractAmount(message);
    const reference = extractReference(message, [
      /(?:txn id|transaction id|ref|receipt)[:#\s-]*([A-Z0-9-]{8,})/i,
      /^([A-Z0-9]{8,12})\s/i,
    ]);
    const customerPhone = extractPhone(message);

    return finalizeParsedSms({
      provider: "AIRTEL_MONEY",
      type,
      amount,
      reference,
      customerPhone,
      warnings: [
        ...(type ? [] : ["Transaction type inferred weakly for Airtel Money message"]),
        ...getNonActionableWarnings(message),
      ],
      minimumConfidence: 0.6,
    });
  },
};
