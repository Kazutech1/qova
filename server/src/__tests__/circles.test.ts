import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';

import app from '../app';

// Mock WhatsApp so tests don't need a real connection
jest.mock('../services/whatsapp', () => ({
  sendWhatsAppMessage: jest.fn().mockResolvedValue(undefined),
  initWhatsApp: jest.fn().mockResolvedValue(undefined),
}));

// Mock Prisma
const mockFindUniqueCircle = jest.fn();
const mockCreateMembership = jest.fn();
const mockUpdateCircle = jest.fn();

jest.mock('../utils/prisma', () => ({
  __esModule: true,
  default: {
    circle: {
      findUnique: (...args: any[]) => mockFindUniqueCircle(...args),
      update: (...args: any[]) => mockUpdateCircle(...args),
    },
    membership: {
      create: (...args: any[]) => mockCreateMembership(...args),
    },
  },
}));

const mockUserToken = jwt.sign({ id: 'user-id-123' }, 'test-secret');

describe('Circles Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /circles/by-invite/:invite_code', () => {
    it('returns circle details when invite code is valid', async () => {
      mockFindUniqueCircle.mockResolvedValue({
        id: 'circle-id-123',
        name: 'Test savings circle',
        invite_code: 'QX-8829-01',
        contribution_amount: 5000000,
        frequency: 'WEEKLY',
        total_slots: 10,
        admin_id: 'admin-id-456',
        admin: { id: 'admin-id-456', name: 'Tunde Balogun', phone: '2348033333333' },
        memberships: [{ user_id: 'admin-id-456' }],
      });

      const res = await request(app)
        .get('/circles/by-invite/QX-8829-01')
        .set('Authorization', `Bearer ${mockUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.circle.name).toBe('Test savings circle');
      expect(res.body.data.circle.members_count).toBe(1);
      expect(res.body.data.circle.admin.name).toBe('Tunde Balogun');
    });

    it('returns 404 when invite code is not found', async () => {
      mockFindUniqueCircle.mockResolvedValue(null);

      const res = await request(app)
        .get('/circles/by-invite/INVALID-CODE')
        .set('Authorization', `Bearer ${mockUserToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /circles/join', () => {
    it('successfully joins a pending circle', async () => {
      mockFindUniqueCircle.mockResolvedValue({
        id: 'circle-id-123',
        name: 'Test savings circle',
        invite_code: 'QX-8829-01',
        contribution_amount: 5000000,
        frequency: 'WEEKLY',
        total_slots: 10,
        status: 'PENDING',
        start_condition: 'AUTO',
        payout_order_type: 'AUTO',
        memberships: [{ user_id: 'admin-id-456' }],
      });

      mockCreateMembership.mockResolvedValue({
        id: 'membership-id-999',
        user_id: 'user-id-123',
        circle_id: 'circle-id-123',
        slot_number: 2,
      });

      mockUpdateCircle.mockResolvedValue({});

      const res = await request(app)
        .post('/circles/join')
        .set('Authorization', `Bearer ${mockUserToken}`)
        .send({ invite_code: 'QX-8829-01' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.membership.slot_number).toBe(2);
      expect(mockCreateMembership).toHaveBeenCalledTimes(1);
    });
  });
});
