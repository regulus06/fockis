import { Injectable } from '@nestjs/common';

@Injectable()
export class EmployerService {
  health() {
    return { module: 'employer', status: 'scaffolded', productionReady: false };
  }
}
