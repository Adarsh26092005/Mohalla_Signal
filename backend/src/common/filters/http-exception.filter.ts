import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const isProduction = process.env.NODE_ENV === 'production';

    // Safe sanitized response format
    let errorResponse: Record<string, unknown> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    if (isHttpException) {
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        errorResponse = { ...errorResponse, ...res };
      } else {
        errorResponse.message = res;
      }
    } else {
      // For unhandled internal server errors, mask sensitive internal details in production
      this.logger.error(
        `Unhandled Exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
      );

      errorResponse.message = isProduction
        ? 'An unexpected internal server error occurred.'
        : exception instanceof Error
          ? exception.message
          : 'Internal Server Error';
    }

    response.status(status).json(errorResponse);
  }
}
