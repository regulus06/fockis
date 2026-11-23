import { Test, TestingModule } from '@nestjs/testing';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';

describe('DisputesController', () => {
  let controller: DisputesController;
  const service = { open: jest.fn(), mine: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisputesController],
      providers: [{ provide: DisputesService, useValue: service }],
    }).compile();

    controller = module.get<DisputesController>(DisputesController);
  });

  it('opens disputes for the signed-in user only', async () => {
    service.open.mockResolvedValue({ id: 'd1' });
    await controller.open({ user: { id: 'u1' } }, { orderId: 'o1', reason: 'damaged', description: 'Arrived broken badly' });
    expect(service.open).toHaveBeenCalledWith('u1', expect.objectContaining({ orderId: 'o1' }));
  });
});
