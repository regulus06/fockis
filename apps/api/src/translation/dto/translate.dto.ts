import {
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class TranslateDto {
  @IsString()
  @Length(1, 10000)
  text!: string;

  /**
   * ISO language code requested by the viewer.
   *
   * Examples:
   * en
   * ht
   * fr
   * es
   * ja
   * zh-CN
   * ar
   */
  @IsString()
  @Length(2, 20)
  @Matches(/^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})?$/)
  targetLanguage!: string;

  /**
   * Optional source language.
   *
   * If omitted, the translation service detects it automatically.
   */
  @IsOptional()
  @IsString()
  @Length(2, 20)
  @Matches(/^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})?$/)
  sourceLanguage?: string;
}