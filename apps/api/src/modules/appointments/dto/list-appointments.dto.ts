import { IsDateString, IsOptional, IsUUID } from "class-validator";

export class ListAppointmentsDto {
  @IsDateString()
  @IsOptional()
  desde?: string;

  @IsDateString()
  @IsOptional()
  hasta?: string;

  @IsUUID()
  @IsOptional()
  medicoId?: string;

  @IsUUID()
  @IsOptional()
  sucursalId?: string;
}
