import { SmsProvider, TransactionType } from "@prisma/client";
import type { ParsedSmsResult } from "./types";

export function normalizePhone(value?: string | null) {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 9) return `0${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return digits;
  if (digits.length === 12 && digits.startsWith("255")) return `0${digits.slice(3)}`;
  return value;
}

export function extractAmount(message: string) {
  const match =
    message.match(/(?:TZS|Ksh|KES|TSH|TSh|Amount:?|Kiasi:?)[^\d]{0,6}([\d,]+(?:\.\d{1,2})?)/i) ??
    message.match(/([\d,]+(?:\.\d{1,2})?)\s?(?:TZS|TSH|TSh)/i);
  if (!match) return undefined;
  return Number(match[1].replace(/,/g, ""));
}

export function extractReference(message: string, patterns?: RegExp[]) {
  const candidates = patterns ?? [
    /(?:ref(?:erence)?|receipt|transaction\s?id|trx\s?id|code)[:#\s-]*([A-Z0-9-]{6,})/i,
    /^([A-Z0-9]{8,12})\s/i,
  ];

  for (const pattern of candidates) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }

  return undefined;
}

export function extractPhone(message: string) {
  const match = message.match(/(?:\+?255|0)[67]\d{8}/);
  return normalizePhone(match?.[0]);
}

export function classifyByKeywords(message: string, mapping: Array<{ type: TransactionType; patterns: RegExp[] }>) {
  const match = mapping.find(({ patterns }) => patterns.some((pattern) => pattern.test(message)));
  return match?.type;
}

export function isFailedTransactionMessage(message: string) {
  return /failed|unsuccessful|haikufanikiwa|imekataliwa|hakikufanikiwa/i.test(message);
}

export function isReversalMessage(message: string) {
  return /reversal|reversed|reverse completed|imefutwa|imerejeshwa|kurejeshwa/i.test(message);
}

export function isProviderWarningMessage(message: string) {
  return /warning|tahadhari|notice|reminder|maintenance|keep your pin|never share|fraud|security alert|promo|campaign|discounted|offer/i.test(message);
}

export function getNonActionableWarnings(message: string) {
  const warnings: string[] = [];

  if (isFailedTransactionMessage(message)) {
    warnings.push("SMS indicates failed transaction");
  }

  if (isReversalMessage(message)) {
    warnings.push("SMS indicates reversal or reversal notice");
  }

  if (isProviderWarningMessage(message)) {
    warnings.push("SMS appears to be provider warning or informational notice");
  }

  return warnings;
}

export function getActionableType(message: string, type?: TransactionType) {
  if (!type) return undefined;
  if (isReversalMessage(message) || isProviderWarningMessage(message)) return undefined;
  return type;
}

export function computeConfidence(params: {
  provider: SmsProvider;
  type?: TransactionType;
  amount?: number;
  reference?: string;
  customerPhone?: string;
}) {
  let score = 0;
  if (params.provider !== "UNKNOWN") score += 0.3;
  if (params.type) score += 0.25;
  if (typeof params.amount === "number" && params.amount > 0) score += 0.2;
  if (params.reference) score += 0.15;
  if (params.customerPhone) score += 0.1;
  return Math.min(1, score);
}

export function finalizeParsedSms(params: {
  provider: SmsProvider;
  type?: TransactionType;
  amount?: number;
  reference?: string;
  externalRef?: string;
  customerPhone?: string;
  warnings?: string[];
  minimumConfidence?: number;
}): ParsedSmsResult {
  const warnings = params.warnings ?? [];
  const baseConfidence = computeConfidence({
    provider: params.provider,
    type: params.type,
    amount: params.amount,
    reference: params.reference,
    customerPhone: params.customerPhone,
  });
  const minimumConfidence = params.minimumConfidence ?? 0.6;
  const hasCoreFields = Boolean(params.type) && typeof params.amount === "number" && params.amount > 0;
  const parseConfidence = hasCoreFields ? baseConfidence : Math.min(baseConfidence, 0.5);

  return {
    provider: params.provider,
    type: params.type,
    amount: params.amount,
    reference: params.reference,
    externalRef: params.externalRef ?? params.reference,
    customerPhone: params.customerPhone,
    parseConfidence,
    parseError:
      hasCoreFields && parseConfidence >= minimumConfidence
        ? null
        : "Could not confidently determine provider, type, and amount from the SMS",
    warnings,
    rawSummary: {
      provider: params.provider,
      type: params.type,
      amount: params.amount,
      reference: params.reference,
      customerPhone: params.customerPhone,
      warnings,
    },
  };
}
