import { Request, Response } from 'express';
declare class WebhookController {
    create(req: Request, res: Response): Promise<Response>;
    list(req: Request, res: Response): Promise<Response>;
    update(req: Request, res: Response): Promise<Response>;
    delete(req: Request, res: Response): Promise<Response>;
}
export declare const webhookController: WebhookController;
export {};
