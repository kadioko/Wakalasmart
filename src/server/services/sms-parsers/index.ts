import { SmsProvider, TransactionType } from "@prisma/client";
import { extractAmount, extractPhone, extractReference, finalizeParsedSms } from "./helpers";
import { airtelMoneyParser } from "./airtel-money";
import { crdbParser } from "./crdb";
import { halopesaParser } from "./halopesa";
import { mixxByYasParser } from "./mixx-by-yas";
import { mpesaParser } from "./mpesa";
import { nmbParser } from "./nmb";
import { selcomPesaParser } from "./selcom-pesa";
import type { ParsedSmsResult, SmsParserFixture, SmsParserModule } from "./types";

const parserModules: SmsParserModule[] = [
  mpesaParser,
  airtelMoneyParser,
  mixxByYasParser,
  halopesaParser,
  crdbParser,
  nmbParser,
  selcomPesaParser,
];

const fallbackTypeMatchers: Array<{ type: TransactionType; patterns: RegExp[] }> = [
  { type: "DEPOSIT", patterns: [/deposit/i, /cash\s?in/i, /umepokea/i, /received/i] },
  { type: "WITHDRAWAL", patterns: [/withdraw/i, /cash\s?out/i, /umetoa/i] },
  { type: "FLOAT_PURCHASE", patterns: [/float\s?purchase/i, /float/i, /top\s?up/i] },
  { type: "BILL_PAYMENT", patterns: [/bill\s?payment/i, /control\s?number/i] },
  { type: "MERCHANT_PAYMENT", patterns: [/merchant\s?payment/i, /lipa/i, /pay\s?merchant/i] },
  { type: "TRANSFER", patterns: [/transfer/i, /send money/i, /umetuma/i] },
  { type: "BANK_DEPOSIT", patterns: [/bank\s?deposit/i, /deposit to bank/i] },
  { type: "BANK_WITHDRAWAL", patterns: [/bank\s?withdraw/i, /withdraw from bank/i] },
];

function detectProvider(message: string, sender?: string, hint?: SmsProvider) {
  if (hint && hint !== "UNKNOWN") return hint;

  const parser = parserModules.find((candidate) => candidate.matches(message, sender));
  return parser?.provider ?? "UNKNOWN";
}

function fallbackParse(message: string, providerHint?: SmsProvider): ParsedSmsResult {
  const type = fallbackTypeMatchers.find(({ patterns }) =>
    patterns.some((pattern) => pattern.test(message))
  )?.type;
  const provider = detectProvider(message, undefined, providerHint);

  return finalizeParsedSms({
    provider,
    type,
    amount: extractAmount(message),
    reference: extractReference(message),
    customerPhone: extractPhone(message),
    warnings: ["Parsed with fallback SMS parser"],
    minimumConfidence: 0.6,
  });
}

export function parseInboundSmsMessage(
  message: string,
  providerHint?: SmsProvider,
  sender?: string
): ParsedSmsResult {
  const detectedProvider = detectProvider(message, sender, providerHint);
  const parser = parserModules.find((candidate) => candidate.provider === detectedProvider);

  if (!parser) {
    return fallbackParse(message, providerHint);
  }

  const parsed = parser.parse(message, sender);

  if (providerHint && providerHint !== "UNKNOWN" && parsed.provider !== providerHint) {
    return {
      ...parsed,
      warnings: [...parsed.warnings, `Provider hint ${providerHint} differed from detected ${parsed.provider}`],
    };
  }

  return parsed;
}

export const smsParserFixtures: SmsParserFixture[] = [
  {
    provider: "MPESA",
    sender: "M-Pesa",
    message: "QJH7K2LMN8 Confirmed. Umepokea TZS 45,000 kutoka 0712345678. Salio lako ni TZS 120,000. M-Pesa Wakala.",
    expected: {
      provider: "MPESA",
      type: "DEPOSIT",
      amount: 45000,
      reference: "QJH7K2LMN8",
      customerPhone: "0712345678",
      minimumConfidence: 0.75,
      parseError: null,
    },
  },
  {
    provider: "AIRTEL_MONEY",
    sender: "Airtel Money",
    message: "TXN ID AX91PLK33. Airtel Money cash in received. Amount: TZS 120,000 from 0755123456. New balance TZS 1,400,000.",
    expected: {
      provider: "AIRTEL_MONEY",
      type: "DEPOSIT",
      amount: 120000,
      reference: "AX91PLK33",
      customerPhone: "0755123456",
      minimumConfidence: 0.75,
      parseError: null,
    },
  },
  {
    provider: "MIXX_BY_YAS",
    sender: "Mixx by Yas",
    message: "Receipt MX44PQL991. Mixx by Yas transfer confirmed. Amount TZS 30,000 sent to 0655123456. Fee TZS 500.",
    expected: {
      provider: "MIXX_BY_YAS",
      type: "TRANSFER",
      amount: 30000,
      reference: "MX44PQL991",
      customerPhone: "0655123456",
      minimumConfidence: 0.75,
      parseError: null,
    },
  },
];
