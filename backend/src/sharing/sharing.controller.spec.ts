import { Test, TestingModule } from '@nestjs/testing';
import { SharingController } from './sharing.controller';

describe('SharingController', () => {
  let controller: SharingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SharingController],
    }).compile();

    controller = module.get<SharingController>(SharingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
