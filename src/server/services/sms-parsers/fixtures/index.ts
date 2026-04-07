import type { SmsParserFixture } from "../types";
import { airtelMoneyFixtures } from "./airtel-money";
import { crdbFixtures } from "./crdb";
import { halopesaFixtures } from "./halopesa";
import { mixxByYasFixtures } from "./mixx-by-yas";
import { mpesaFixtures } from "./mpesa";
import { nmbFixtures } from "./nmb";
import { selcomPesaFixtures } from "./selcom-pesa";

export const smsParserFixtures: SmsParserFixture[] = [
  ...mpesaFixtures,
  ...airtelMoneyFixtures,
  ...mixxByYasFixtures,
  ...halopesaFixtures,
  ...crdbFixtures,
  ...nmbFixtures,
  ...selcomPesaFixtures,
];
