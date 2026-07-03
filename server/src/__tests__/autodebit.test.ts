process.env.JWT_SECRET = 'test-secret';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDebitMandate = jest.fn();
const mockGetMandateStatus = jest.fn();
jest.mock('../services/nomba', () => ({
  debitMandate: (...a: any[]) => mockDebitMandate(...a),
  getMandateStatus: (...a: any[]) => mockGetMandateStatus(...a),
}));

const mockMarkPaid = jest.fn().mockResolvedValue({ id: 'c1', status: 'PAID' });
const mockEnsure = jest.fn();
jest.mock('../services/contribution', () => ({
  markContributionPaid: (...a: any[]) => mockMarkPaid(...a),
  ensureAutoDebitContribution: (...a: any[]) => mockEnsure(...a),
}));

const mockCheckPayout = jest.fn().mockResolvedValue(undefined);
jest.mock('../services/payout', () => ({
  checkAndTriggerPayout: (...a: any[]) => mockCheckPayout(...a),
}));

const mockSendWhatsApp = jest.fn().mockResolvedValue(undefined);
jest.mock('../services/whatsapp', () => ({
  sendWhatsAppMessage: (...a: any[]) => mockSendWhatsApp(...a),
  initWhatsApp: jest.fn().mockResolvedValue(undefined),
}));

const mockMandateFindMany = jest.fn();
const mockMandateUpdate = jest.fn().mockResolvedValue({});
const mockContributionUpdate = jest.fn().mockResolvedValue({});
jest.mock('../utils/prisma', () => ({
  __esModule: true,
  default: {
    directDebitMandate: {
      findMany: (...a: any[]) => mockMandateFindMany(...a),
      update: (...a: any[]) => mockMandateUpdate(...a),
    },
    contribution: {
      update: (...a: any[]) => mockContributionUpdate(...a),
    },
  },
}));

import { runAutoDebitSweep, runMandateActivationCheck } from '../services/cron';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const activeMandate = () => ({
  id: 'm1',
  user_id: 'u1',
  circle_id: 'circle1',
  nomba_mandate_id: 'nomba-mandate-1',
  status: 'ACTIVE',
  amount: 5000000,
  user: { phone: '2348011111111', name: 'Emeka' },
  circle: { id: 'circle1', name: 'Lagos Circle', status: 'ACTIVE', current_cycle: 1, frequency: 'WEEKLY' },
});

const dueContribution = (over: Record<string, any> = {}) => ({
  id: 'c1',
  user_id: 'u1',
  circle_id: 'circle1',
  amount: 5000000,
  status: 'PENDING',
  due_date: new Date(Date.now() - 60_000), // due 1 min ago
  auto_debit_attempts: 0,
  ...over,
});

beforeEach(() => jest.clearAllMocks());

// ─── runAutoDebitSweep ────────────────────────────────────────────────────────

describe('runAutoDebitSweep', () => {
  it('debits a due contribution and marks it paid on code 00', async () => {
    mockMandateFindMany.mockResolvedValue([activeMandate()]);
    mockEnsure.mockResolvedValue(dueContribution());
    mockDebitMandate.mockResolvedValue({ code: '00', status: 'SUCCESS', message: 'ok' });

    await runAutoDebitSweep();

    // optimistic lock stamped BEFORE the debit call
    expect(mockContributionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({ auto_debit_attempts: { increment: 1 } }),
      })
    );
    expect(mockDebitMandate).toHaveBeenCalledWith('nomba-mandate-1', 5000000);
    expect(mockMarkPaid).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1' }),
      expect.objectContaining({ paidVia: 'AUTO_DEBIT' })
    );
    expect(mockSendWhatsApp).toHaveBeenCalled(); // success receipt
  });

  it('skips a contribution that is not yet due', async () => {
    mockMandateFindMany.mockResolvedValue([activeMandate()]);
    mockEnsure.mockResolvedValue(dueContribution({ due_date: new Date(Date.now() + 3_600_000) }));

    await runAutoDebitSweep();

    expect(mockDebitMandate).not.toHaveBeenCalled();
    expect(mockMarkPaid).not.toHaveBeenCalled();
  });

  it('skips a contribution that already hit the retry cap', async () => {
    mockMandateFindMany.mockResolvedValue([activeMandate()]);
    mockEnsure.mockResolvedValue(dueContribution({ auto_debit_attempts: 3 }));

    await runAutoDebitSweep();

    expect(mockDebitMandate).not.toHaveBeenCalled();
  });

  it('does not mark paid and bumps failure_count when the debit is declined', async () => {
    mockMandateFindMany.mockResolvedValue([activeMandate()]);
    mockEnsure.mockResolvedValue(dueContribution());
    mockDebitMandate.mockResolvedValue({ code: '01', status: 'FAILED', message: 'insufficient funds' });

    await runAutoDebitSweep();

    expect(mockMarkPaid).not.toHaveBeenCalled();
    expect(mockMandateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { failure_count: { increment: 1 } } })
    );
    expect(mockSendWhatsApp).toHaveBeenCalled(); // decline notice
  });

  it('skips mandates whose circle is not ACTIVE', async () => {
    const m = activeMandate();
    m.circle.status = 'PENDING';
    mockMandateFindMany.mockResolvedValue([m]);

    await runAutoDebitSweep();

    expect(mockEnsure).not.toHaveBeenCalled();
    expect(mockDebitMandate).not.toHaveBeenCalled();
  });
});

// ─── runMandateActivationCheck ────────────────────────────────────────────────

describe('runMandateActivationCheck', () => {
  it('promotes a pending mandate to ACTIVE and notifies the member', async () => {
    mockMandateFindMany.mockResolvedValue([
      {
        id: 'm1',
        nomba_mandate_id: 'nomba-mandate-1',
        status: 'PENDING_ACTIVATION',
        amount: 5000000,
        user: { phone: '2348011111111' },
        circle: { name: 'Lagos Circle' },
      },
    ]);
    mockGetMandateStatus.mockResolvedValue({ status: 'ACTIVE', rawStatus: 'Active', rejectionComment: '' });

    await runMandateActivationCheck();

    expect(mockMandateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'm1' }, data: { status: 'ACTIVE' } })
    );
    expect(mockSendWhatsApp).toHaveBeenCalled();
  });

  it('leaves a still-pending mandate untouched', async () => {
    mockMandateFindMany.mockResolvedValue([
      {
        id: 'm1',
        nomba_mandate_id: 'nomba-mandate-1',
        status: 'PENDING_ACTIVATION',
        amount: 5000000,
        user: { phone: '2348011111111' },
        circle: { name: 'Lagos Circle' },
      },
    ]);
    mockGetMandateStatus.mockResolvedValue({ status: 'PENDING_ACTIVATION', rawStatus: 'Pending', rejectionComment: '' });

    await runMandateActivationCheck();

    expect(mockMandateUpdate).not.toHaveBeenCalled();
  });
});
