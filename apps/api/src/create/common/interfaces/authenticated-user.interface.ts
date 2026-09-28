import { UserRole } from '../../auth/schemas/user.schema';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
