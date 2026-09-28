import { Injectable, PipeTransform } from '@nestjs/common';
import { Types } from 'mongoose';
import { InvalidObjectIdException } from '../constants/errors';

export function assertValidObjectId(id: string): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new InvalidObjectIdException(id);
  }
}

/**
 * Route param pipe: validates a Mongo ObjectId string, throwing a clean
 * 400 error instead of letting an invalid id reach Mongoose (which would
 * otherwise throw a raw CastError).
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    assertValidObjectId(value);
    return value;
  }
}
