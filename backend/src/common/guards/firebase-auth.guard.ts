import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { UsersService } from '../../modules/users/users.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn('[FirebaseAuthGuard] Request missing Authorization header');
      throw new UnauthorizedException(
        'Missing Authorization header. Expected: Bearer <Firebase_ID_Token>',
      );
    }

    // Support case-insensitive Bearer prefix and arbitrary whitespace
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match || !match[1]) {
      this.logger.warn('[FirebaseAuthGuard] Malformed Authorization header format');
      throw new UnauthorizedException(
        'Malformed Authorization header. Format must be Bearer <Firebase_ID_Token>',
      );
    }

    // Clean any surrounding quotes or trailing whitespace
    const token = match[1].trim().replace(/^["']|["']$/g, '');
    if (!token) {
      this.logger.warn('[FirebaseAuthGuard] Empty token string provided after Bearer prefix');
      throw new UnauthorizedException('Empty Bearer authentication token provided');
    }

    try {
      // 1. Verify cryptographic validity of Firebase ID token using Firebase Admin SDK
      const decodedToken = await this.firebaseAdminService.verifyIdToken(token);

      // 2. Synchronize / retrieve corresponding application user from PostgreSQL
      const appUser = await this.usersService.findOrCreateFromFirebase(decodedToken);

      if (!appUser.isActive) {
        this.logger.warn(`[FirebaseAuthGuard] Access denied: Deactivated user (ID: ${appUser.id})`);
        throw new UnauthorizedException('User account has been deactivated');
      }

      // 3. Attach both application user and verified token payload to request object
      request.user = appUser;
      request.firebaseUser = decodedToken;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(
        `[FirebaseAuthGuard] Guard rejection: ${
          error instanceof Error ? error.message : 'Authentication failed'
        }`,
      );
      throw new UnauthorizedException('Authentication failed: Invalid or expired Firebase token');
    }
  }
}
