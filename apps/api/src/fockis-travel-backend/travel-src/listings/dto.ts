import {
IsArray,
IsBoolean,
IsEnum,
IsNumber,
IsObject,
IsOptional,
IsString,
Min,
} from 'class-validator';

import type { ListingType } from './listing.schema';

const LISTING_TYPE_VALUES = [
'stay',
'rental',
'meeting',
'event',
'restaurant',
'car',
'flight',
'transfer',
'experience',
'attraction',
'thing',
] as const;

export class ListingInventoryDto {
@IsNumber()
@Min(0)
total!: number;

@IsNumber()
@Min(0)
reserved!: number;

@IsOptional()
@IsNumber()
@Min(0)
available?: number;
}

export class CreateListingDto {
@IsString()
name!: string;

@IsOptional()
@IsString()
title?: string;

@IsEnum(LISTING_TYPE_VALUES)
type!: ListingType;

@IsOptional()
@IsString()
category?: string;

@IsOptional()
@IsArray()
@IsString({ each: true })
categories?: string[];

@IsOptional()
@IsString()
description?: string;

@IsOptional()
@IsString()
country?: string;

@IsOptional()
@IsString()
city?: string;

@IsOptional()
@IsString()
address?: string;

@IsOptional()
@IsNumber()
latitude?: number;

@IsOptional()
@IsNumber()
longitude?: number;

@IsOptional()
@IsString()
phone?: string;

@IsOptional()
@IsString()
website?: string;

@IsString()
currency!: string;

@IsNumber()
@Min(0)
price!: number;

@IsOptional()
@IsString()
priceUnit?: string;

@IsOptional()
@IsNumber()
@Min(0)
capacity?: number;

@IsOptional()
@IsNumber()
@Min(0)
bedrooms?: number;

@IsOptional()
@IsNumber()
@Min(0)
bathrooms?: number;

@IsOptional()
@IsArray()
@IsString({ each: true })
images?: string[];

@IsOptional()
@IsArray()
@IsString({ each: true })
amenities?: string[];

@IsOptional()
@IsArray()
@IsString({ each: true })
tags?: string[];

@IsOptional()
@IsObject()
inventory?: ListingInventoryDto;

@IsOptional()
@IsObject()
metadata?: Record<string, unknown>;
}

export class UpdateListingDto {
@IsOptional()
@IsString()
title?: string;

@IsOptional()
@IsString()
name?: string;

@IsOptional()
@IsString()
category?: string;

@IsOptional()
@IsArray()
@IsString({ each: true })
categories?: string[];

@IsOptional()
@IsEnum(LISTING_TYPE_VALUES)
type?: ListingType;

@IsOptional()
@IsString()
description?: string;

@IsOptional()
@IsString()
country?: string;

@IsOptional()
@IsString()
city?: string;

@IsOptional()
@IsString()
address?: string;

@IsOptional()
@IsNumber()
latitude?: number;

@IsOptional()
@IsNumber()
longitude?: number;

@IsOptional()
@IsString()
phone?: string;

@IsOptional()
@IsString()
website?: string;

@IsOptional()
@IsString()
currency?: string;

@IsOptional()
@IsNumber()
@Min(0)
price?: number;

@IsOptional()
@IsString()
priceUnit?: string;

@IsOptional()
@IsNumber()
@Min(0)
capacity?: number;

@IsOptional()
@IsNumber()
@Min(0)
bedrooms?: number;

@IsOptional()
@IsNumber()
@Min(0)
bathrooms?: number;

@IsOptional()
@IsArray()
@IsString({ each: true })
images?: string[];

@IsOptional()
@IsArray()
@IsString({ each: true })
amenities?: string[];

@IsOptional()
@IsArray()
@IsString({ each: true })
tags?: string[];

@IsOptional()
@IsObject()
inventory?: ListingInventoryDto;

@IsOptional()
@IsObject()
metadata?: Record<string, unknown>;

@IsOptional()
@IsBoolean()
active?: boolean;
}