import { Request, Response } from 'express';
declare class AuthController {
    register(req: Request, res: Response): Promise<Response>;
    login(req: Request, res: Response): Promise<Response>;
}
export declare const authController: AuthController;
export {};
