import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ConfigService } from '@nestjs/config';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'environment') return 'test';
              return null;
            }),
          },
        },
      ],
    }).compile();

    healthController = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('should return health status payload', () => {
      const result = healthController.check();
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('service', 'Mohalla Signal API');
      expect(result).toHaveProperty('environment', 'test');
    });
  });
});
