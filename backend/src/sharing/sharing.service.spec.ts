import { Test, TestingModule } from '@nestjs/testing';
import { SharingService } from './sharing.service';

describe('SharingService', () => {
  let service: SharingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SharingService],
    }).compile();

    service = module.get<SharingService>(SharingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
