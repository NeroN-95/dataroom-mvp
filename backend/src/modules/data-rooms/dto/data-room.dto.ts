import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateDataRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;
}

export class UpdateDataRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;
}
