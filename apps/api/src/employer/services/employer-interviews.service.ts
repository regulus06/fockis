import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class EmployerInterviewsService {
  // Implement using existing Careers/User models and enforce employer membership on every query.
  notImplemented(): never {
    throw new NotImplementedException('EmployerInterviewsService must be implemented and tested before enabling this endpoint.');
  }
}
