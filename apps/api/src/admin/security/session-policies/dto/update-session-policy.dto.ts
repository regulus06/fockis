import { PartialType } from '@nestjs/mapped-types';
import { CreateSessionPolicyDto } from './create-session-policy.dto';

export class UpdateSessionPolicyDto extends PartialType(CreateSessionPolicyDto) {}
