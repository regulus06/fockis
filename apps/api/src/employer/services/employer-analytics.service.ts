import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class EmployerAnalyticsService {
  // Implement using existing Careers/User models and enforce employer membership on every query.
  notImplemented(): never {
    throw new NotImplementedException('EmployerAnalyticsService must be implemented and tested before enabling this endpoint.');
  }
}
