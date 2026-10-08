import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 4000);
  const apiPrefix = configService.get<string>('apiPrefix', 'api/v1');
  const corsOrigins = configService.get<string[]>('cors.origin', ['http://localhost:5173']);

  // Security Headers via Helmet (configured to allow Swagger UI in development)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Explicit CORS Configuration
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Global Route Prefix
  app.setGlobalPrefix(apiPrefix);

  // Global Input Validation Pipe (Protects against Mass Assignment and Malformed Payloads)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter for Safe Error Responses
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Request Logging Interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Enable Graceful Shutdown Hooks
  app.enableShutdownHooks();

  // Swagger / OpenAPI Specification & UI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mohalla Signal API')
    .setDescription(
      'Neighborhood Demand Intelligence API for Local Kirana & Retail Merchants.\n\n' +
        '**Authentication Instructions:**\n' +
        '1. Obtain a Firebase ID Token for an authenticated user.\n' +
        '2. Click the **Authorize** button at the top right.\n' +
        '3. Paste the Firebase ID Token into the **Value** field under **Firebase-JWT**.\n' +
        '4. Click **Authorize** and make authenticated API calls.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        name: 'Authorization',
        description: 'Provide a valid Firebase ID Token (Bearer <token>)',
      },
      'Firebase-JWT',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  logger.log(`🚀 Mohalla Signal Backend running on port ${port} [Prefix: /${apiPrefix}]`);
  logger.log(`📚 Swagger Documentation accessible at: http://localhost:${port}/${apiPrefix}/docs`);
  logger.log(`🔒 Security standards active: Helmet, CORS, DTO Whitelisting, Throttler, Firebase Auth`);
}

bootstrap();
