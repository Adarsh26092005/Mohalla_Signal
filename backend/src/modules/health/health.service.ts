import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  getHealth() {
    return {
      status: 'ok',
      service: 'Mohalla Signal API',
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('environment'),
      version: '0.1.0',
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
