import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import type { JWTPayload, UserRegistrationRequest } from '../../types/index.js';

interface AuthenticatedRequest extends Request {
  user?: {
    externalUserId: string;
    accountId: string;
    permissions: string[];
    metadata?: Record<string, any>;
  };
}

interface RegisteredUser {
  externalUserId: string;
  accountId: string;
  email: string;
  name: string;
  permissions: string[];
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

class AuthenticationService {
  private users = new Map<string, RegisteredUser>();
  private usersByAccount = new Map<string, Set<string>>(); // accountId -> Set<externalUserId>
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.JWT_SECRET || 'your-super-secret-key';
  }

  public async registerUser(
    accountId: string,
    request: UserRegistrationRequest
  ): Promise<RegisteredUser> {
    try {
      const userKey = `${accountId}:${request.externalUserId}`;
      
      // Check if user already exists
      if (this.users.has(userKey)) {
        const existingUser = this.users.get(userKey)!;
        // Update existing user
        existingUser.email = request.email;
        existingUser.name = request.name;
        existingUser.permissions = request.permissions;
        existingUser.metadata = { ...existingUser.metadata, ...request.metadata };
        existingUser.updatedAt = new Date();
        
        console.log(`📝 User updated: ${request.externalUserId}`);
        return existingUser;
      }

      // Create new user
      const user: RegisteredUser = {
        externalUserId: request.externalUserId,
        accountId,
        email: request.email,
        name: request.name,
        permissions: request.permissions,
        isActive: true,
        metadata: request.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.users.set(userKey, user);
      
      // Update account users index
      if (!this.usersByAccount.has(accountId)) {
        this.usersByAccount.set(accountId, new Set());
      }
      this.usersByAccount.get(accountId)!.add(request.externalUserId);

      console.log(`👤 New user registered: ${request.externalUserId} for account ${accountId}`);
      return user;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  public generateToken(
    accountId: string,
    externalUserId: string,
    permissions: string[],
    expiresIn = '24h'
  ): string {
    const payload: JWTPayload = {
      sub: externalUserId,
      accountId,
      permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiresIn(expiresIn)
    };

    return jwt.sign(payload, this.secretKey);
  }

  public verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.secretKey) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  public authenticateRequest = (requiredPermissions?: string[]) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            error: 'Authorization token required',
            code: 'AUTH_TOKEN_MISSING'
          });
        }

        const token = authHeader.substring(7);
        const payload = this.verifyToken(token);

        // Verify user still exists and is active
        const userKey = `${payload.accountId}:${payload.sub}`;
        const user = this.users.get(userKey);
        
        if (!user || !user.isActive) {
          return res.status(401).json({
            error: 'User not found or inactive',
            code: 'AUTH_USER_INACTIVE'
          });
        }

        // Check permissions if required
        if (requiredPermissions && requiredPermissions.length > 0) {
          const hasPermission = requiredPermissions.some(permission => 
            payload.permissions.includes(permission) || payload.permissions.includes('admin')
          );
          
          if (!hasPermission) {
            return res.status(403).json({
              error: 'Insufficient permissions',
              code: 'AUTH_INSUFFICIENT_PERMISSIONS',
              required: requiredPermissions,
              current: payload.permissions
            });
          }
        }

        // Attach user info to request
        req.user = {
          externalUserId: payload.sub,
          accountId: payload.accountId,
          permissions: payload.permissions,
          metadata: user.metadata
        };

        next();
      } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
          error: 'Invalid token',
          code: 'AUTH_TOKEN_INVALID'
        });
      }
    };
  };

  public async updateUserPermissions(
    accountId: string,
    externalUserId: string,
    permissions: string[]
  ): Promise<RegisteredUser | null> {
    const userKey = `${accountId}:${externalUserId}`;
    const user = this.users.get(userKey);
    
    if (user) {
      user.permissions = permissions;
      user.updatedAt = new Date();
      console.log(`🔐 Permissions updated for user: ${externalUserId}`);
      return user;
    }
    
    return null;
  }

  public async deactivateUser(
    accountId: string,
    externalUserId: string
  ): Promise<boolean> {
    const userKey = `${accountId}:${externalUserId}`;
    const user = this.users.get(userKey);
    
    if (user) {
      user.isActive = false;
      user.updatedAt = new Date();
      console.log(`🚫 User deactivated: ${externalUserId}`);
      return true;
    }
    
    return false;
  }

  public getUsersByAccount(accountId: string): RegisteredUser[] {
    const users: RegisteredUser[] = [];
    const userIds = this.usersByAccount.get(accountId);
    
    if (userIds) {
      for (const userId of userIds) {
        const user = this.users.get(`${accountId}:${userId}`);
        if (user) {
          users.push(user);
        }
      }
    }
    
    return users;
  }

  public getUser(accountId: string, externalUserId: string): RegisteredUser | null {
    return this.users.get(`${accountId}:${externalUserId}`) || null;
  }

  private parseExpiresIn(expiresIn: string): number {
    const value = parseInt(expiresIn.slice(0, -1));
    const unit = expiresIn.slice(-1);
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 24 * 60 * 60; // 24 hours default
    }
  }

  public getAuthStats(accountId?: string) {
    let totalUsers = 0;
    let activeUsers = 0;
    
    for (const user of this.users.values()) {
      if (!accountId || user.accountId === accountId) {
        totalUsers++;
        if (user.isActive) activeUsers++;
      }
    }
    
    return {
      totalUsers,
      activeUsers,
      accountsWithUsers: this.usersByAccount.size
    };
  }
}

export const authService = new AuthenticationService();
export { AuthenticatedRequest };