import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class EmployerVerificationService {
  // Implement using existing Careers/User models and enforce employer membership on every query.
  notImplemented(): never {
    throw new NotImplementedException('EmployerVerificationService must be implemented and tested before enabling this endpoint.');
  }
}
