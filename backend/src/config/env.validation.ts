import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
  Min,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @IsOptional()
  PORT: number = 4000;

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api/v1';

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:5173';

  // Firebase Admin SDK Configuration
  @IsString()
  @IsOptional()
  FIREBASE_PROJECT_ID?: string;

  @IsString()
  @IsOptional()
  FIREBASE_CLIENT_EMAIL?: string;

  @IsString()
  @IsOptional()
  FIREBASE_PRIVATE_KEY?: string;

  // Database Configuration
  @IsString()
  @IsOptional()
  DATABASE_URL: string = 'postgresql://postgres:postgres@localhost:5432/mohalla_signal?schema=public';

  // Redis Configuration
  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  // Privacy & Aggregation Settings
  @IsNumber()
  @Min(1)
  @IsOptional()
  DEMAND_MERCHANT_THRESHOLD: number = 3;

  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_TTL: number = 60;

  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT: number = 100;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorDetails = errors
      .map((err) => Object.values(err.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`[Configuration Error] Invalid environment variables: ${errorDetails}`);
  }

  return validatedConfig;
}
