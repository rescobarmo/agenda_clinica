import { IsDateString, IsOptional, IsUUID } from "class-validator";

export class RescheduleAppointmentDto {
  @IsDateString()
  fecha!: string;

  @IsUUID()
  @IsOptional()
  consultorioId?: string;
}
