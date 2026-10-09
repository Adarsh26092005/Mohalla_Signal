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
  private configuredProjectId?: string;

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
            projectId,
          });
        } else {
          this.firebaseApp = getApp();
        }
        this.isConfigured = true;
        this.configuredProjectId = projectId;
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
   * Verifies the client-provided Firebase ID token using Firebase Admin SDK.
   * Returns decoded token payload or throws safe UnauthorizedException.
   */
  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    if (!this.isConfigured || !this.firebaseApp) {
      this.logger.error(
        'Cannot verify Firebase token: Firebase Admin SDK is not initialized in backend environment.',
      );
      throw new InternalServerErrorException(
        'Authentication service is currently unconfigured. Please check backend Firebase environment variables.',
      );
    }

    try {
      const auth = getAuth(this.firebaseApp);
      // Verify signature, expiration, issuer and audience against configured projectId
      const decodedToken = await auth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error: any) {
      const errorCode = error?.code || 'auth/unknown';
      const errorMessage = error?.message || 'Invalid token';

      // Log safe diagnostic metadata for development debugging (no tokens or secrets printed)
      this.logger.warn(
        `[FirebaseAuth] Token verification rejected (${errorCode}): ${errorMessage}`,
      );

      throw new UnauthorizedException('Authentication failed: Invalid or expired Firebase token');
    }
  }

  /**
   * Helper to check if Firebase is configured
   */
  get initialized(): boolean {
    return this.isConfigured;
  }

  get projectId(): string | undefined {
    return this.configuredProjectId;
  }
}
