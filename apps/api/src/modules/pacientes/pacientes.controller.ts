import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { TenantContext } from "@agenda/shared";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { PacientesService, type FichaClinicaResponse } from "./pacientes.service";

@ApiTags("pacientes")
@ApiBearerAuth()
@Controller("pacientes")
export class PacientesController {
  constructor(private readonly pacientes: PacientesService) {}

  @Get(":id/ficha-clinica")
  getFicha(
    @CurrentTenant() ctx: TenantContext,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<FichaClinicaResponse> {
    return this.pacientes.getFichaClinica(ctx, id);
  }
}
