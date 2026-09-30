import { IsDateString, IsOptional, IsUUID } from "class-validator";

export class QueryAvailabilityDto {
  @IsUUID()
  clinicaId!: string;

  @IsUUID()
  sucursalId!: string;

  @IsUUID()
  @IsOptional()
  especialidadId?: string;

  @IsUUID()
  @IsOptional()
  medicoId?: string;

  @IsDateString()
  fecha!: string;
}
