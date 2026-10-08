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

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or malformed Authorization header. Expected Bearer <Firebase_ID_Token>',
      );
    }

    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      throw new UnauthorizedException('Empty Bearer authentication token provided');
    }

    try {
      // 1. Verify cryptographic validity of Firebase ID token
      const decodedToken = await this.firebaseAdminService.verifyIdToken(token);

      // 2. Synchronize / retrieve corresponding application user from PostgreSQL
      const appUser = await this.usersService.findOrCreateFromFirebase(decodedToken);

      if (!appUser.isActive) {
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
        `Authentication guard rejected request: ${
          error instanceof Error ? error.message : 'Unknown authentication error'
        }`,
      );
      throw new UnauthorizedException('Authentication failed: Invalid or expired Firebase token');
    }
  }
}
