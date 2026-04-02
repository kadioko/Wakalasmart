import { SmsProvider, TransactionType } from "@prisma/client";

export interface ParsedSmsResult {
  provider: SmsProvider;
  type?: TransactionType;
  amount?: number;
  reference?: string;
  externalRef?: string;
  customerPhone?: string;
  parseConfidence: number;
  parseError: string | null;
  warnings: string[];
  rawSummary: {
    provider: SmsProvider;
    type?: TransactionType;
    amount?: number;
    reference?: string;
    customerPhone?: string;
    warnings?: string[];
  };
}

export interface SmsParserModule {
  provider: SmsProvider;
  matches(message: string, sender?: string): boolean;
  parse(message: string, sender?: string): ParsedSmsResult;
}

export interface SmsParserFixture {
  provider: SmsProvider;
  sender?: string;
  message: string;
  expected: {
    provider: SmsProvider;
    type?: TransactionType;
    amount?: number;
    reference?: string;
    customerPhone?: string;
    minimumConfidence: number;
    parseError: string | null;
  };
}
