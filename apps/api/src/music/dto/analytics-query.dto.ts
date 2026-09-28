import { IsIn, IsOptional } from 'class-validator';

export type AnalyticsRange = '7d' | '30d' | '90d' | '1y' | 'all';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d', '1y', 'all'])
  range?: AnalyticsRange = '30d';
}
