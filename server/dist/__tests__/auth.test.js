"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
process.env.JWT_SECRET = 'test-secret';
const app_1 = __importDefault(require("../app"));
// Mock WhatsApp so tests don't need a real connection
jest.mock('../services/whatsapp', () => ({
    sendWhatsAppMessage: jest.fn().mockResolvedValue(undefined),
    initWhatsApp: jest.fn().mockResolvedValue(undefined),
}));
// Mock Prisma
const mockOtpCreate = jest.fn();
const mockOtpFindFirst = jest.fn();
const mockOtpUpdate = jest.fn();
const mockUserUpsert = jest.fn();
jest.mock('../utils/prisma', () => ({
    __esModule: true,
    default: {
        oTP: {
            create: (...args) => mockOtpCreate(...args),
            findFirst: (...args) => mockOtpFindFirst(...args),
            update: (...args) => mockOtpUpdate(...args),
        },
        user: {
            upsert: (...args) => mockUserUpsert(...args),
        },
    },
}));
const PHONE = '+2348012345678';
const VALID_CODE = '483920';
describe('POST /auth/send-otp', () => {
    beforeEach(() => jest.clearAllMocks());
    it('returns 200 and sends OTP for a valid phone', async () => {
        mockOtpCreate.mockResolvedValue({});
        const res = await (0, supertest_1.default)(app_1.default).post('/auth/send-otp').send({ phone: PHONE });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(mockOtpCreate).toHaveBeenCalledTimes(1);
    });
    it('returns 400 for a missing phone', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/auth/send-otp').send({});
        expect(res.status).toBe(400);
    });
    it('returns 400 for a phone that is too short', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/auth/send-otp').send({ phone: '123' });
        expect(res.status).toBe(400);
    });
});
describe('POST /auth/verify-otp', () => {
    beforeEach(() => jest.clearAllMocks());
    it('returns 200 with token when OTP is valid', async () => {
        mockOtpFindFirst.mockResolvedValue({ id: 'otp-id', phone: PHONE, code: VALID_CODE });
        mockOtpUpdate.mockResolvedValue({});
        mockUserUpsert.mockResolvedValue({ id: 'user-id', phone: PHONE, name: '' });
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/auth/verify-otp')
            .send({ phone: PHONE, code: VALID_CODE });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toBeDefined();
        expect(res.body.data.user.phone).toBe(PHONE);
    });
    it('returns 400 when OTP is invalid or expired', async () => {
        mockOtpFindFirst.mockResolvedValue(null);
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/auth/verify-otp')
            .send({ phone: PHONE, code: '000000' });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
    it('returns 400 for a code that is not 6 digits', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/auth/verify-otp')
            .send({ phone: PHONE, code: '123' });
        expect(res.status).toBe(400);
    });
    it('returns 400 for missing fields', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/auth/verify-otp').send({});
        expect(res.status).toBe(400);
    });
});
//# sourceMappingURL=auth.test.js.map