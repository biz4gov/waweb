import { Request, Response } from 'express';
declare class StatusController {
    getStatus(req: Request, res: Response): Promise<Response>;
}
export declare const statusController: StatusController;
export {};
