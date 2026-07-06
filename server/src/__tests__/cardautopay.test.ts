process.env.JWT_SECRET = 'test-secret';
process.env.CARD_VERIFY_DELAY_MS = '10';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCharge = jest.fn();
const mockListCheckout = jest.fn();
jest.mock('../services/nomba', () => ({
  chargeTokenizedCard: (...a: any[]) => mockCharge(...a),
  listCheckoutPayments: (...a: any[]) => mockListCheckout(...a),
  listVirtualAccountDeposits: jest.fn().mockResolvedValue([]),
  fetchTransactionFeed: jest.fn().mockResolvedValue([]),
  debitMandate: jest.fn(),
  getMandateStatus: jest.fn(),
}));

const mockSettle = jest.fn();
jest.mock('../services/cardautopay', () => {
  const actual = jest.requireActual('../services/cardautopay');
  return {
    ...actual,
    settleCardPayment: (...a: any[]) => mockSettle(...a),
    reconcileCardAuthorization: jest.fn(),
  };
});

const mockEnsure = jest.fn();
jest.mock('../services/contribution', () => ({
  ensureAutoDebitContribution: (...a: any[]) => mockEnsure(...a),
  markContributionPaid: jest.fn(),
}));

jest.mock('../services/payout', () => ({ checkAndTriggerPayout: jest.fn() }));

const mockSendWhatsApp = jest.fn().mockResolvedValue(undefined);
jest.mock('../services/whatsapp', () => ({
  sendWhatsAppMessage: (...a: any[]) => mockSendWhatsApp(...a),
  initWhatsApp: jest.fn(),
}));

const mockAuthFindMany = jest.fn();
const mockAuthUpdate = jest.fn().mockResolvedValue({});
const mockContributionUpdate = jest.fn().mockResolvedValue({});
jest.mock('../utils/prisma', () => ({
  __esModule: true,
  default: {
    cardAuthorization: {
      findMany: (...a: any[]) => mockAuthFindMany(...a),
      update: (...a: any[]) => mockAuthUpdate(...a),
    },
    contribution: {
      update: (...a: any[]) => mockContributionUpdate(...a),
    },
  },
}));

import { runCardChargeSweep } from '../services/cron';
import { cardOrderRef, parseCardOrderRef } from '../services/cardautopay';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CIRCLE_ID = '6a4a8eeeea21035d699aee29';
const USER_ID = '6a2a9a3b66805a1870fb7e2a';

const activeAuth = (over: Record<string, any> = {}) => ({
  id: 'auth1',
  user_id: USER_ID,
  circle_id: CIRCLE_ID,
  token_key: 'tok-123',
  status: 'ACTIVE',
  token_expires_at: null,
  user: { phone: '+2348011111111', name: 'Emeka' },
  circle: { id: CIRCLE_ID, name: 'Lagos Circle', status: 'ACTIVE', current_cycle: 2, frequency: 'WEEKLY', contribution_amount: 10000 },
  ...over,
});

const dueContribution = (over: Record<string, any> = {}) => ({
  id: 'c1',
  user_id: USER_ID,
  circle_id: CIRCLE_ID,
  amount: 10000,
  status: 'PENDING',
  due_date: new Date(Date.now() - 60_000),
  auto_debit_attempts: 0,
  auto_debit_last_attempt: null,
  ...over,
});

beforeEach(() => jest.clearAllMocks());

// ─── Order ref convention ─────────────────────────────────────────────────────

describe('card order refs', () => {
  it('round-trips without an attempt suffix', () => {
    const ref = cardOrderRef(CIRCLE_ID, USER_ID, 3);
    expect(parseCardOrderRef(ref)).toEqual({ circleId: CIRCLE_ID, userId: USER_ID, cycle: 3 });
  });

  it('round-trips with an attempt suffix', () => {
    const ref = cardOrderRef(CIRCLE_ID, USER_ID, 3, 1783300000000);
    expect(parseCardOrderRef(ref)).toEqual({ circleId: CIRCLE_ID, userId: USER_ID, cycle: 3 });
  });

  it('rejects foreign refs', () => {
    expect(parseCardOrderRef('checkout_01KWVJK8YHPTWEFZ')).toBeNull();
    expect(parseCardOrderRef(`qova-${CIRCLE_ID}-${USER_ID}-cycle1`)).toBeNull(); // VA ref, not card
  });
});

// ─── runCardChargeSweep ───────────────────────────────────────────────────────

describe('runCardChargeSweep', () => {
  it('charges a due contribution and settles after feed verification', async () => {
    mockAuthFindMany.mockResolvedValue([activeAuth()]);
    mockEnsure.mockResolvedValue(dueContribution());
    mockCharge.mockResolvedValue({ ok: true, code: '00', message: 'success' });
    mockListCheckout.mockImplementation(async () => [
      { orderReference: mockCharge.mock.calls[0][0].orderReference, amountKobo: 10000, reference: 'txn-1' },
    ]);
    mockSettle.mockResolvedValue(true);

    await runCardChargeSweep();

    // optimistic lock stamped before the charge
    expect(mockContributionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({ auto_debit_attempts: { increment: 1 } }),
      })
    );
    expect(mockCharge).toHaveBeenCalledWith(expect.objectContaining({ tokenKey: 'tok-123', amount: 10000 }));
    expect(mockSettle).toHaveBeenCalled();
    expect(mockAuthUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ failure_count: 0 }) })
    );
    expect(mockSendWhatsApp).toHaveBeenCalled(); // success receipt
  });

  it('does not settle when the charge is declined; bumps failure_count', async () => {
    mockAuthFindMany.mockResolvedValue([activeAuth()]);
    mockEnsure.mockResolvedValue(dueContribution());
    mockCharge.mockResolvedValue({ ok: false, code: '05', message: 'insufficient funds' });

    await runCardChargeSweep();

    expect(mockSettle).not.toHaveBeenCalled();
    expect(mockAuthUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { failure_count: { increment: 1 } } })
    );
    expect(mockSendWhatsApp).toHaveBeenCalled(); // decline notice
  });

  it('skips contributions that are not due yet', async () => {
    mockAuthFindMany.mockResolvedValue([activeAuth()]);
    mockEnsure.mockResolvedValue(dueContribution({ due_date: new Date(Date.now() + 3_600_000) }));

    await runCardChargeSweep();

    expect(mockCharge).not.toHaveBeenCalled();
  });

  it('respects the retry cooldown after a recent attempt', async () => {
    mockAuthFindMany.mockResolvedValue([activeAuth()]);
    mockEnsure.mockResolvedValue(dueContribution({
      auto_debit_attempts: 1,
      auto_debit_last_attempt: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
    }));

    await runCardChargeSweep();

    expect(mockCharge).not.toHaveBeenCalled();
  });

  it('marks an expired token EXPIRED and never charges it', async () => {
    mockAuthFindMany.mockResolvedValue([activeAuth({ token_expires_at: new Date(Date.now() - 1000) })]);

    await runCardChargeSweep();

    expect(mockCharge).not.toHaveBeenCalled();
    expect(mockAuthUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'auth1' }, data: { status: 'EXPIRED' } })
    );
    expect(mockSendWhatsApp).toHaveBeenCalled(); // re-enroll prompt
  });
});
