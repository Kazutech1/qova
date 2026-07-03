import crypto from 'crypto';

process.env.NOMBA_WEBHOOK_SIGNATURE_KEY = 'test-signature-key';

import { verifyWebhookSignature } from '../services/nomba';

const KEY = 'test-signature-key';
const TIMESTAMP = '1700000000';

const payload = {
  event_type: 'payment_success',
  requestId: 'req-123',
  data: {
    merchant: { userId: 'user-1', walletId: 'wallet-1' },
    transaction: {
      transactionId: 'txn-1',
      type: 'vact_transfer',
      time: '2026-07-03T00:00:00Z',
      responseCode: '00',
      aliasAccountReference: 'qova-circle1-user1-cycle1',
      transactionAmount: 1000,
    },
  },
};

function sign(body: any, timestamp: string, key: string): string {
  const tx = body.data.transaction;
  const m = body.data.merchant;
  const s = [
    body.event_type, body.requestId, m.userId, m.walletId,
    tx.transactionId, tx.type, tx.time, tx.responseCode, timestamp,
  ].join(':');
  return crypto.createHmac('sha256', key).update(s).digest('base64');
}

describe('verifyWebhookSignature', () => {
  it('accepts a correctly signed payload', () => {
    const headers = {
      'nomba-signature': sign(payload, TIMESTAMP, KEY),
      'nomba-timestamp': TIMESTAMP,
    };
    expect(verifyWebhookSignature(payload, headers)).toBe(true);
  });

  it('rejects a tampered signature', () => {
    const headers = {
      'nomba-signature': sign(payload, TIMESTAMP, KEY) + 'x',
      'nomba-timestamp': TIMESTAMP,
    };
    expect(verifyWebhookSignature(payload, headers)).toBe(false);
  });

  it('rejects a signature made with the wrong key', () => {
    const headers = {
      'nomba-signature': sign(payload, TIMESTAMP, 'attacker-key'),
      'nomba-timestamp': TIMESTAMP,
    };
    expect(verifyWebhookSignature(payload, headers)).toBe(false);
  });

  it('rejects when the timestamp differs from what was signed', () => {
    const headers = {
      'nomba-signature': sign(payload, TIMESTAMP, KEY),
      'nomba-timestamp': '9999999999',
    };
    expect(verifyWebhookSignature(payload, headers)).toBe(false);
  });

  it('rejects when signature headers are missing', () => {
    expect(verifyWebhookSignature(payload, {})).toBe(false);
  });
});
