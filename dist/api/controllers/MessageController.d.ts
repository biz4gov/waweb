import { Request, Response } from 'express';
declare class MessageController {
    send(req: Request, res: Response): Promise<Response>;
}
export declare const messageController: MessageController;
export {};
