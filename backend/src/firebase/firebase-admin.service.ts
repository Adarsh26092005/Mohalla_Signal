import {
  Injectable,
  OnModuleInit,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private firebaseApp?: App;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('firebase.projectId');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');
    const privateKey = this.configService.get<string>('firebase.privateKey');

    if (projectId && clientEmail && privateKey) {
      try {
        const apps = getApps();
        if (apps.length === 0) {
          this.firebaseApp = initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
        } else {
          this.firebaseApp = getApp();
        }
        this.isConfigured = true;
        this.logger.log(`Firebase Admin SDK initialized successfully for project: ${projectId}`);
      } catch (error) {
        this.logger.error(
          `Failed to initialize Firebase Admin SDK: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    } else {
      this.logger.warn(
        'Firebase Admin credentials not configured in environment. Real token verification requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.',
      );
    }
  }

  /**
   * Verifies the client-provided Firebase ID token.
   * Returns decoded token payload or throws safe UnauthorizedException.
   */
  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    if (!this.isConfigured || !this.firebaseApp) {
      this.logger.error(
        'Cannot verify Firebase token: Firebase Admin SDK is not configured in backend environment.',
      );
      throw new InternalServerErrorException(
        'Authentication service is currently unconfigured. Please configure Firebase Admin environment credentials.',
      );
    }

    try {
      const auth = getAuth(this.firebaseApp);
      const decodedToken = await auth.verifyIdToken(idToken, true);
      return decodedToken;
    } catch (error) {
      this.logger.warn(
        `Firebase token verification failed: ${
          error instanceof Error ? error.message : 'Invalid token'
        }`,
      );
      // Never leak internal stack trace to client
      throw new UnauthorizedException('Invalid or expired Firebase authentication token');
    }
  }

  /**
   * Helper to check if Firebase is configured
   */
  get initialized(): boolean {
    return this.isConfigured;
  }
}
