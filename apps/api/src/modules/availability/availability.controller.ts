import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles as AppRoles, type TenantContext } from "@agenda/shared";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AvailabilityService, type Slot } from "./availability.service";
import { CreateAvailabilityDto } from "./dto/create-availability.dto";
import { QueryAvailabilityDto } from "./dto/query-availability.dto";

@ApiTags("disponibilidad")
@ApiBearerAuth()
@Controller()
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Post("disponibilidad")
  @Roles(
    AppRoles.SUPER_ADMIN,
    AppRoles.CLINIC_ADMIN,
    AppRoles.BRANCH_ADMIN,
    AppRoles.RECEPTIONIST,
    AppRoles.DOCTOR,
  )
  create(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.availability.create(ctx, dto);
  }

  @Get("disponibilidad")
  getSlots(
    @CurrentTenant() ctx: TenantContext,
    @Query() query: QueryAvailabilityDto,
  ): Promise<Slot[]> {
    return this.availability.getAvailableSlots(ctx, query);
  }

  @Get("medicos/:id/disponibilidad")
  listByDoctor(
    @CurrentTenant() ctx: TenantContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.availability.listByDoctor(ctx, id);
  }
}
