export interface Account {
    id: string;
    phoneNumber: string;
    status: 'pending' | 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}
export interface Message {
    id: string;
    to: string;
    from: string;
    content: string;
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
    createdAt: Date;
    updatedAt: Date;
}
export interface SendMessageRequest {
    to: string;
    message: string;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
