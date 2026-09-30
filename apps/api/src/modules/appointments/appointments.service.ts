import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AppointmentStatus,
  prisma,
  type Cita,
  type Paciente,
} from "@agenda/database";
import { Roles as AppRoles, type TenantContext } from "@agenda/shared";
import {
  addMinutes,
  overlaps,
  resolveClinicId,
} from "../../common/utils/tenant.util";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { ListAppointmentsDto } from "./dto/list-appointments.dto";
import { RescheduleAppointmentDto } from "./dto/reschedule-appointment.dto";

const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.RESCHEDULED,
];

@Injectable()
export class AppointmentsService {
  async create(ctx: TenantContext, dto: CreateAppointmentDto): Promise<Cita> {
    const clinicaId = resolveClinicId(ctx, dto.clinicaId);
    const duracion = dto.duracionMinutos ?? 30;

    const pacienteId = this.resolvePacienteId(ctx, dto.pacienteId);

    const medico = await prisma.medico.findFirst({
      where: { id: dto.medicoId, clinicaId },
    });
    if (!medico) {
      throw new NotFoundException("Médico no encontrado en esta clínica");
    }

    const paciente = await prisma.paciente.findFirst({
      where: { id: pacienteId, clinicaId },
    });
    if (!paciente) {
      throw new NotFoundException("Paciente no encontrado en esta clínica");
    }

    const start = new Date(dto.fecha);
    const end = addMinutes(start, duracion);

    await this.ensureNoDoctorOverlap(clinicaId, dto.medicoId, start, end);
    await this.ensureNoPatientOverlap(clinicaId, pacienteId, start, end);

    const cita = await prisma.cita.create({
      data: {
        clinicaId,
        sucursalId: dto.sucursalId,
        consultorioId: dto.consultorioId,
        especialidadId: dto.especialidadId,
        medicoId: dto.medicoId,
        pacienteId,
        fecha: start,
        duracionMinutos: duracion,
        origen: "web",
        creadoPor: ctx.userId,
      },
    });

    await prisma.auditoria.create({
      data: {
        clinicaId,
        usuarioId: ctx.userId,
        accion: "CREATE_CITA",
        entidad: "Cita",
        entidadId: cita.id,
      },
    });

    return cita;
  }

  async findAll(
    ctx: TenantContext,
    query: ListAppointmentsDto,
  ): Promise<Cita[]> {
    const where = this.buildListWhere(ctx, query);

    return prisma.cita.findMany({
      where,
      include: {
        medico: true,
        paciente: true,
        sucursal: true,
      },
      orderBy: { fecha: "desc" },
    });
  }

  async findOne(ctx: TenantContext, id: string): Promise<Cita> {
    const cita = await this.getOwnedCita(ctx, id);
    return prisma.cita.findUniqueOrThrow({
      where: { id: cita.id },
      include: {
        medico: true,
        paciente: true,
        sucursal: true,
        consultorio: true,
      },
    });
  }

  async reschedule(
    ctx: TenantContext,
    id: string,
    dto: RescheduleAppointmentDto,
  ): Promise<Cita> {
    const cita = await this.getOwnedCita(ctx, id);

    if (!ACTIVE_STATUSES.includes(cita.estado)) {
      throw new ConflictException(
        "Solo se puede reagendar una cita pendiente, confirmada o reagendada",
      );
    }

    const start = new Date(dto.fecha);
    const end = addMinutes(start, cita.duracionMinutos);

    await this.ensureNoDoctorOverlap(
      cita.clinicaId,
      cita.medicoId,
      start,
      end,
      cita.id,
    );
    await this.ensureNoPatientOverlap(
      cita.clinicaId,
      cita.pacienteId,
      start,
      end,
      cita.id,
    );

    const updated = await prisma.cita.update({
      where: { id: cita.id },
      data: {
        fecha: start,
        estado: AppointmentStatus.RESCHEDULED,
        consultorioId: dto.consultorioId ?? cita.consultorioId,
      },
    });

    await prisma.auditoria.create({
      data: {
        clinicaId: cita.clinicaId,
        usuarioId: ctx.userId,
        accion: "RESCHEDULE_CITA",
        entidad: "Cita",
        entidadId: cita.id,
      },
    });

    return updated;
  }

  async cancel(ctx: TenantContext, id: string): Promise<Cita> {
    const cita = await this.getOwnedCita(ctx, id);

    if (!ACTIVE_STATUSES.includes(cita.estado)) {
      throw new ConflictException("Solo se puede cancelar una cita activa");
    }

    const updated = await prisma.cita.update({
      where: { id: cita.id },
      data: { estado: AppointmentStatus.CANCELLED },
    });

    await prisma.auditoria.create({
      data: {
        clinicaId: cita.clinicaId,
        usuarioId: ctx.userId,
        accion: "CANCEL_CITA",
        entidad: "Cita",
        entidadId: cita.id,
      },
    });

    return updated;
  }

  async agendaByDoctor(
    ctx: TenantContext,
    medicoId: string,
    query: ListAppointmentsDto,
  ): Promise<Cita[]> {
    const targetMedicoId =
      ctx.rol === AppRoles.DOCTOR && ctx.medicoId ? ctx.medicoId : medicoId;

    const medico = await prisma.medico.findUnique({
      where: { id: targetMedicoId },
    });
    if (!medico) {
      throw new NotFoundException("Médico no encontrado");
    }

    if (ctx.rol !== AppRoles.SUPER_ADMIN) {
      const clinicaId = resolveClinicId(ctx);
      if (medico.clinicaId !== clinicaId) {
        throw new ForbiddenException("Médico fuera de su clínica");
      }
    }

    return prisma.cita.findMany({
      where: {
        clinicaId: medico.clinicaId,
        medicoId: targetMedicoId,
        ...(query.desde || query.hasta
          ? {
              fecha: {
                ...(query.desde ? { gte: new Date(query.desde) } : {}),
                ...(query.hasta ? { lte: new Date(query.hasta) } : {}),
              },
            }
          : {}),
      },
      include: { paciente: true, sucursal: true },
      orderBy: { fecha: "asc" },
    });
  }

  async getPatient(
    ctx: TenantContext,
    id: string,
  ): Promise<Paciente & { ficha: unknown }> {
    const cita = await this.getOwnedCita(ctx, id);

    const paciente = await prisma.paciente.findUnique({
      where: { id: cita.pacienteId },
      include: { ficha: true },
    });

    if (!paciente) {
      throw new NotFoundException("Paciente no encontrado");
    }

    return paciente as Paciente & { ficha: unknown };
  }

  private buildListWhere(
    ctx: TenantContext,
    query: ListAppointmentsDto,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    const isSuper = ctx.rol === AppRoles.SUPER_ADMIN;
    if (!isSuper) {
      where.clinicaId = resolveClinicId(ctx);
    }

    if (query.desde || query.hasta) {
      where.fecha = {
        ...(query.desde ? { gte: new Date(query.desde) } : {}),
        ...(query.hasta ? { lte: new Date(query.hasta) } : {}),
      };
    }

    if (ctx.rol === AppRoles.DOCTOR && ctx.medicoId) {
      where.medicoId = ctx.medicoId;
    } else if (query.medicoId) {
      where.medicoId = query.medicoId;
    }

    if (ctx.rol === AppRoles.PATIENT && ctx.pacienteId) {
      where.pacienteId = ctx.pacienteId;
    }

    if (query.sucursalId) {
      where.sucursalId = query.sucursalId;
    }

    return where;
  }

  private resolvePacienteId(ctx: TenantContext, requested?: string): string {
    if (ctx.rol === AppRoles.PATIENT) {
      if (!ctx.pacienteId) {
        throw new ForbiddenException("Sin paciente asociado a su usuario");
      }
      return ctx.pacienteId;
    }
    if (!requested) {
      throw new BadRequestException("pacienteId es requerido");
    }
    return requested;
  }

  private async getOwnedCita(ctx: TenantContext, id: string): Promise<Cita> {
    const cita = await prisma.cita.findUnique({ where: { id } });
    if (!cita) {
      throw new NotFoundException("Cita no encontrada");
    }

    if (ctx.rol === AppRoles.SUPER_ADMIN) {
      return cita;
    }

    const clinicaId = resolveClinicId(ctx);
    if (cita.clinicaId !== clinicaId) {
      throw new ForbiddenException("Cita fuera de su clínica");
    }

    if (
      ctx.rol === AppRoles.DOCTOR &&
      ctx.medicoId &&
      cita.medicoId !== ctx.medicoId
    ) {
      throw new ForbiddenException("No tiene acceso a esta cita");
    }

    if (
      ctx.rol === AppRoles.PATIENT &&
      ctx.pacienteId &&
      cita.pacienteId !== ctx.pacienteId
    ) {
      throw new ForbiddenException("No tiene acceso a esta cita");
    }

    return cita;
  }

  private async ensureNoDoctorOverlap(
    clinicaId: string,
    medicoId: string,
    start: Date,
    end: Date,
    excludeId?: string,
  ): Promise<void> {
    const dayStart = new Date(start);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(start);
    dayEnd.setHours(23, 59, 59, 999);

    const citas = await prisma.cita.findMany({
      where: {
        clinicaId,
        medicoId,
        estado: {
          notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
        },
        fecha: { gte: dayStart, lte: dayEnd },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (
      citas.some((c) =>
        overlaps(c.fecha, addMinutes(c.fecha, c.duracionMinutos), start, end),
      )
    ) {
      throw new ConflictException("El médico ya tiene una cita en ese horario");
    }
  }

  private async ensureNoPatientOverlap(
    clinicaId: string,
    pacienteId: string,
    start: Date,
    end: Date,
    excludeId?: string,
  ): Promise<void> {
    const dayStart = new Date(start);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(start);
    dayEnd.setHours(23, 59, 59, 999);

    const citas = await prisma.cita.findMany({
      where: {
        clinicaId,
        pacienteId,
        estado: {
          notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
        },
        fecha: { gte: dayStart, lte: dayEnd },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (
      citas.some((c) =>
        overlaps(c.fecha, addMinutes(c.fecha, c.duracionMinutos), start, end),
      )
    ) {
      throw new ConflictException("El paciente ya tiene una cita a esa hora");
    }
  }
}
