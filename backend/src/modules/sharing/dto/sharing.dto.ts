import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ShareMode, ShareRole } from '@prisma/client';

export class CreateShareDto {
  @IsString()
  nodeId!: string;

  @IsEnum(ShareMode)
  mode!: ShareMode;

  @IsOptional()
  @IsEnum(ShareRole)
  role?: ShareRole;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsEmail({}, { each: true })
  grantEmails?: string[];
}

export class AddGrantDto {
  @IsEmail()
  email!: string;
}
