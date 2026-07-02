import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';

import app from '../app';

// Mock Nomba Service
jest.mock('../services/nomba', () => ({
  createVirtualAccount: jest.fn().mockResolvedValue({
    accountNumber: '1234567890',
    accountName: 'Qova Ajo - Test Circle',
    bankName: 'Nomba Bank',
    accountRef: 'test-ref',
    expiryDate: '2026-07-03 08:00:00',
  }),
}));

// Mock WhatsApp
jest.mock('../services/whatsapp', () => ({
  sendWhatsAppMessage: jest.fn().mockResolvedValue(undefined),
  initWhatsApp: jest.fn().mockResolvedValue(undefined),
}));

// Mock Prisma
const mockFindUniqueCircle = jest.fn();
const mockFindFirstMembership = jest.fn();
const mockFindFirstContribution = jest.fn();
const mockCreateContribution = jest.fn();
const mockUpdateContribution = jest.fn();
const mockFindUniqueContribution = jest.fn();
const mockUpdateCircle = jest.fn();
const mockFindManyContributions = jest.fn();

jest.mock('../utils/prisma', () => ({
  __esModule: true,
  default: {
    circle: {
      findUnique: (...args: any[]) => mockFindUniqueCircle(...args),
      update: (...args: any[]) => mockUpdateCircle(...args),
    },
    membership: {
      findFirst: (...args: any[]) => mockFindFirstMembership(...args),
    },
    contribution: {
      findFirst: (...args: any[]) => mockFindFirstContribution(...args),
      create: (...args: any[]) => mockCreateContribution(...args),
      update: (...args: any[]) => mockUpdateContribution(...args),
      findUnique: (...args: any[]) => mockFindUniqueContribution(...args),
      findMany: (...args: any[]) => mockFindManyContributions(...args),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'user-id-123', reliability_score: 50 }),
      update: jest.fn().mockResolvedValue({}),
    }
  },
}));

const mockUserToken = jwt.sign({ id: 'user-id-123' }, 'test-secret');

describe('Contributions Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /contributions/pay', () => {
    it('creates and returns a new virtual account for contribution', async () => {
      mockFindUniqueCircle.mockResolvedValue({
        id: 'circle-id-123',
        name: 'Test savings circle',
        status: 'ACTIVE',
        contribution_amount: 5000000,
        frequency: 'WEEKLY',
        current_cycle: 1,
        cycle_started_at: new Date(),
      });

      mockFindFirstMembership.mockResolvedValue({
        id: 'membership-id-123',
        user_id: 'user-id-123',
        circle_id: 'circle-id-123',
      });

      mockFindFirstContribution.mockResolvedValue(null);

      mockCreateContribution.mockResolvedValue({
        id: 'contrib-id-999',
        user_id: 'user-id-123',
        circle_id: 'circle-id-123',
        amount: 5000000,
        virtual_account_number: '1234567890',
        virtual_account_bank: 'Nomba Bank',
      });

      const res = await request(app)
        .post('/contributions/pay')
        .set('Authorization', `Bearer ${mockUserToken}`)
        .send({ circle_id: 'circle-id-123' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.account_number).toBe('1234567890');
      expect(res.body.data.bank_name).toBe('Nomba Bank');
    });

    it('returns existing unpaid virtual account details if already created', async () => {
      mockFindUniqueCircle.mockResolvedValue({
        id: 'circle-id-123',
        name: 'Test savings circle',
        status: 'ACTIVE',
        contribution_amount: 5000000,
        frequency: 'WEEKLY',
        current_cycle: 1,
        cycle_started_at: new Date(),
      });

      mockFindFirstMembership.mockResolvedValue({
        id: 'membership-id-123',
        user_id: 'user-id-123',
        circle_id: 'circle-id-123',
      });

      mockFindFirstContribution.mockResolvedValue({
        id: 'contrib-id-999',
        user_id: 'user-id-123',
        circle_id: 'circle-id-123',
        amount: 5000000,
        status: 'PENDING',
        nomba_account_ref: 'existing-ref',
        virtual_account_number: '1234567890',
        virtual_account_bank: 'Nomba Bank',
      });

      const res = await request(app)
        .post('/contributions/pay')
        .set('Authorization', `Bearer ${mockUserToken}`)
        .send({ circle_id: 'circle-id-123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.account_number).toBe('1234567890');
    });
  });

  describe('POST /contributions/simulate-payment', () => {
    it('marks contribution as paid', async () => {
      mockFindUniqueCircle.mockResolvedValue({
        id: 'circle-id-123',
        name: 'Test savings circle',
        status: 'ACTIVE',
        contribution_amount: 5000000,
        frequency: 'WEEKLY',
        current_cycle: 1,
        cycle_started_at: new Date(),
        payout_order: ['user-id-123'],
        memberships: [{ user_id: 'user-id-123', user: { name: 'Test User' } }],
        admin: { phone: '2348011111111' },
      });

      mockFindUniqueContribution.mockResolvedValue({
        id: 'contrib-id-999',
        user_id: 'user-id-123',
        circle_id: 'circle-id-123',
        status: 'PENDING',
        circle: { id: 'circle-id-123', cycle_started_at: new Date() },
      });

      mockUpdateContribution.mockResolvedValue({
        id: 'contrib-id-999',
        status: 'PAID',
      });

      mockFindManyContributions.mockResolvedValue([]);

      const res = await request(app)
        .post('/contributions/simulate-payment')
        .send({ account_ref: 'test-ref' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PAID');
    });
  });
});
