import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles as AppRoles, type TenantContext } from "@agenda/shared";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AppointmentsService } from "./appointments.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { ListAppointmentsDto } from "./dto/list-appointments.dto";
import { RescheduleAppointmentDto } from "./dto/reschedule-appointment.dto";

@ApiTags("citas")
@ApiBearerAuth()
@Controller()
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post("citas")
  @Roles(
    AppRoles.SUPER_ADMIN,
    AppRoles.CLINIC_ADMIN,
    AppRoles.BRANCH_ADMIN,
    AppRoles.RECEPTIONIST,
    AppRoles.PATIENT,
  )
  create(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateAppointmentDto) {
    return this.appointments.create(ctx, dto);
  }

  @Get("citas")
  list(
    @CurrentTenant() ctx: TenantContext,
    @Query() query: ListAppointmentsDto,
  ) {
    return this.appointments.findAll(ctx, query);
  }

  @Get("citas/:id")
  findOne(
    @CurrentTenant() ctx: TenantContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.appointments.findOne(ctx, id);
  }

  @Get("citas/:id/paciente")
  getPatient(
    @CurrentTenant() ctx: TenantContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.appointments.getPatient(ctx, id);
  }

  @Patch("citas/:id/reagendar")
  @Roles(
    AppRoles.SUPER_ADMIN,
    AppRoles.CLINIC_ADMIN,
    AppRoles.BRANCH_ADMIN,
    AppRoles.RECEPTIONIST,
    AppRoles.PATIENT,
  )
  reschedule(
    @CurrentTenant() ctx: TenantContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointments.reschedule(ctx, id, dto);
  }

  @Patch("citas/:id/cancelar")
  @Roles(
    AppRoles.SUPER_ADMIN,
    AppRoles.CLINIC_ADMIN,
    AppRoles.BRANCH_ADMIN,
    AppRoles.RECEPTIONIST,
    AppRoles.PATIENT,
  )
  cancel(
    @CurrentTenant() ctx: TenantContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.appointments.cancel(ctx, id);
  }

  @Get("medicos/:id/agenda")
  agenda(
    @CurrentTenant() ctx: TenantContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: ListAppointmentsDto,
  ) {
    return this.appointments.agendaByDoctor(ctx, id, query);
  }
}
