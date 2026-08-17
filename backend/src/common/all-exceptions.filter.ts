import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<{ method: string; url: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        return res.status(status).json({ statusCode: status, path: req.url, ...body });
      }
      message = body;
    } else if (exception instanceof Error) {
      this.logger.error(
        `${req.method} ${req.url} — ${exception.message}`,
        exception.stack,
      );
    }

    res.status(status).json({
      statusCode: status,
      message,
      path: req.url,
    });
  }
}
