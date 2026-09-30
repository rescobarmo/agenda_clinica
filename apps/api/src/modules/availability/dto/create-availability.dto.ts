import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from "class-validator";

export class CreateAvailabilityDto {
  @IsUUID()
  medicoId!: string;

  @IsUUID()
  sucursalId!: string;

  @IsUUID()
  @IsOptional()
  consultorioId?: string;

  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana!: number;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  horaInicio!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  horaFin!: string;

  @IsDateString()
  vigenteDesde!: string;

  @IsDateString()
  @IsOptional()
  vigenteHasta?: string;
}
