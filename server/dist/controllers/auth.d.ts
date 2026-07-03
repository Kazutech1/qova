import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function sendOtpHandler(req: Request, res: Response): Promise<void>;
export declare function verifyOtpHandler(req: Request, res: Response): Promise<void>;
export declare function whatsappStatusHandler(_req: Request, res: Response): Promise<void>;
export declare function whatsappReconnectHandler(_req: Request, res: Response): Promise<void>;
export declare function completeProfileHandler(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=auth.d.ts.map