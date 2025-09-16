import { Request, Response } from 'express';
declare class AccountController {
    initialize(req: Request, res: Response): Promise<Response>;
    getQRCode(req: Request, res: Response): Promise<void>;
}
export declare const accountController: AccountController;
export {};
