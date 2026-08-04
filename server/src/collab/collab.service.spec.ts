import { Test, TestingModule } from '@nestjs/testing';
import { CollabService } from './collab.service';

describe('CollabService', () => {
  let service: CollabService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CollabService],
    }).compile();

    service = module.get<CollabService>(CollabService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
