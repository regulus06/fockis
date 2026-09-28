export class CreatePropertyDto {
  title: string;
  description: string;
  price: number;

  location?: string;
  type?: string;

  bedrooms?: number;
  bathrooms?: number;

  images?: string[];
}