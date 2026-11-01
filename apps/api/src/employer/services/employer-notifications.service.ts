import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class EmployerNotificationsService {
  // Implement using existing Careers/User models and enforce employer membership on every query.
  notImplemented(): never {
    throw new NotImplementedException('EmployerNotificationsService must be implemented and tested before enabling this endpoint.');
  }
}
