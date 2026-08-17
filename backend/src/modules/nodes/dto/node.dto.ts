import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export type ConflictStrategy = 'rename' | 'replace' | 'error';
const STRATEGIES: ConflictStrategy[] = ['rename', 'replace', 'error'];

export class CreateFolderDto {
  @IsString()
  dataRoomId!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsIn(STRATEGIES)
  onConflict?: ConflictStrategy;
}

export class UploadTargetDto {
  @IsString()
  dataRoomId!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsIn(STRATEGIES)
  onConflict?: ConflictStrategy;
}

export class RenameNodeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsIn(STRATEGIES)
  onConflict?: ConflictStrategy;
}

export class MoveNodeDto {
  @IsOptional()
  @IsString()
  targetParentId?: string | null;

  @IsOptional()
  @IsIn(STRATEGIES)
  onConflict?: ConflictStrategy;
}
