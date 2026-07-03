import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function payContributionHandler(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function webhookHandler(req: Request, res: Response): Promise<void>;
export declare function simulatePaymentHandler(req: Request, res: Response): Promise<void>;
export declare function simulateAllPaymentsHandler(req: Request, res: Response): Promise<void>;
export declare function getContributionsHandler(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=contributions.d.ts.map