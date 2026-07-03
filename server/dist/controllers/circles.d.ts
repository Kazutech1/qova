import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function createCircleHandler(req: AuthRequest, res: Response): Promise<void>;
export declare function getCircleHandler(req: AuthRequest, res: Response): Promise<void>;
export declare function getCircleByInviteHandler(req: AuthRequest, res: Response): Promise<void>;
export declare function joinCircleHandler(req: AuthRequest, res: Response): Promise<void>;
export declare function startCircleHandler(req: AuthRequest, res: Response): Promise<void>;
export declare function setPayoutOrderHandler(req: AuthRequest, res: Response): Promise<void>;
export declare function getCircleMembersHandler(req: AuthRequest, res: Response): Promise<void>;
export declare function getCircleHistoryHandler(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=circles.d.ts.map