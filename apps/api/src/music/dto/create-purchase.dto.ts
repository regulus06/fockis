import { IsNotEmpty, IsString } from 'class-validator';

// Note what is deliberately NOT here: price, userId, producerId. All of
// those are re-derived server-side from the content record so the client
// can never influence what gets charged or who gets entitled.
export class CreatePurchaseDto {
  @IsString()
  @IsNotEmpty()
  contentId: string;
}
