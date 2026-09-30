import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from "class-validator";

export class CreateAppointmentDto {
  @IsUUID()
  clinicaId!: string;

  @IsUUID()
  sucursalId!: string;

  @IsUUID()
  @IsOptional()
  consultorioId?: string;

  @IsUUID()
  @IsOptional()
  especialidadId?: string;

  @IsUUID()
  medicoId!: string;

  @IsUUID()
  @IsOptional()
  pacienteId?: string;

  @IsDateString()
  fecha!: string;

  @IsInt()
  @Min(5)
  @IsOptional()
  duracionMinutos?: number;
}
