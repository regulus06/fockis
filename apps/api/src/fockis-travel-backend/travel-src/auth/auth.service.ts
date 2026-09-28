import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './user.schema';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(@InjectModel(User.name) private users: Model<UserDocument>, private jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const exists = await this.users.exists({ email: dto.email.toLowerCase() });
    if (exists) throw new ConflictException('Email already registered');
    const user = await this.users.create({
      email: dto.email.toLowerCase(),
      name: dto.name,
      passwordHash: await bcrypt.hash(dto.password, 12),
    });
    return this.issue(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ email: dto.email.toLowerCase() });
    if (!user || !user.active || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issue(user);
  }

  private issue(user: UserDocument) {
    return {
      accessToken: this.jwt.sign({ sub: user.id, email: user.email, role: user.role }),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }
}
