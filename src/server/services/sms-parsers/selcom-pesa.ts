import { SmsProvider, TransactionType } from "@prisma/client";
import { classifyByKeywords, extractAmount, extractPhone, extractReference, finalizeParsedSms, getActionableType, getNonActionableWarnings } from "./helpers";
import type { SmsParserModule } from "./types";

const typeMatchers: Array<{ type: TransactionType; patterns: RegExp[] }> = [
  { type: "DEPOSIT", patterns: [/umepokea/i, /cash\s?in/i, /deposit confirmed/i, /umepokea fedha/i] },
  { type: "WITHDRAWAL", patterns: [/cash\s?out/i, /withdrawal confirmed/i, /umetoa/i, /umetoa fedha/i] },
  { type: "TRANSFER", patterns: [/transfer/i, /transfer successful/i, /send money/i, /umetuma/i] },
  { type: "BILL_PAYMENT", patterns: [/bill payment/i, /control number/i, /malipo ya bili/i] },
];

export const selcomPesaParser: SmsParserModule = {
  provider: "SELCOM_PESA",
  matches(message, sender) {
    return /selcom|selcom\s?pesa|selcompesa|selcom sms/i.test(`${sender ?? ""} ${message}`);
  },
  parse(message) {
    const type = getActionableType(message, classifyByKeywords(message, typeMatchers));
    const reference = extractReference(message, [
      /^([A-Z0-9]{8,12})\s/i,
      /(?:receipt|ref|kumbukumbu|transaction id)[:#\s-]*([A-Z0-9-]{8,})/i,
    ]);

    return finalizeParsedSms({
      provider: SmsProvider.SELCOM_PESA,
      type,
      amount: extractAmount(message),
      reference,
      customerPhone: extractPhone(message),
      warnings: [
        ...(type ? [] : ["Selcom Pesa transaction type required fallback inference"]),
        ...getNonActionableWarnings(message),
      ],
      minimumConfidence: 0.72,
    });
  },
};
