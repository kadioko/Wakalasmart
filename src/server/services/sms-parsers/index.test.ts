import test from "node:test";
import assert from "node:assert/strict";
import { parseInboundSmsMessage, smsParserFixtures } from "./index";

test("fixture-based provider SMS parsers extract expected core fields", () => {
  for (const fixture of smsParserFixtures) {
    const parsed = parseInboundSmsMessage(
      fixture.message,
      fixture.provider,
      fixture.sender
    );

    assert.equal(parsed.provider, fixture.expected.provider);
    assert.equal(parsed.type, fixture.expected.type);
    assert.equal(parsed.amount, fixture.expected.amount);
    assert.equal(parsed.reference, fixture.expected.reference);
    assert.equal(parsed.customerPhone, fixture.expected.customerPhone);
    assert.equal(parsed.parseError, fixture.expected.parseError);
    assert.ok(
      parsed.parseConfidence >= fixture.expected.minimumConfidence,
      `Expected confidence >= ${fixture.expected.minimumConfidence} for ${fixture.provider}, got ${parsed.parseConfidence}`
    );
  }
});

test("fallback parser marks unknown SMS with low confidence error", () => {
  const parsed = parseInboundSmsMessage("System maintenance notice only", undefined, "Notifier");

  assert.equal(parsed.provider, "UNKNOWN");
  assert.equal(parsed.parseError, "Could not confidently determine provider, type, and amount from the SMS");
  assert.ok(parsed.parseConfidence < 0.6);
});
