import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { prisma, type Prisma } from "@agenda/database";
import { Roles as AppRoles, type TenantContext } from "@agenda/shared";
import { resolveClinicId } from "../../common/utils/tenant.util";

type PacienteConFicha = Prisma.PacienteGetPayload<{ include: { ficha: true } }>;

export interface FichaClinicaResponse {
  id: string;
  nombre: string;
  apellido: string | null;
  rut: string | null;
  telefono: string | null;
  email: string | null;
  ficha: {
    antecedentes: string | null;
    alergias: string | null;
    medicamentos: string | null;
    notasEvolucion: string | null;
  } | null;
}

@Injectable()
export class PacientesService {
  async getFichaClinica(
    ctx: TenantContext,
    pacienteId: string,
  ): Promise<FichaClinicaResponse> {
    const paciente = await prisma.paciente.findUnique({
      where: { id: pacienteId },
      include: { ficha: true },
    });

    if (!paciente) {
      throw new NotFoundException("Paciente no encontrado");
    }

    await this.authorize(ctx, paciente);

    return this.toResponse(paciente);
  }

  private async authorize(
    ctx: TenantContext,
    paciente: PacienteConFicha,
  ): Promise<void> {
    if (ctx.rol === AppRoles.SUPER_ADMIN) {
      return;
    }

    const clinicaId = resolveClinicId(ctx);
    if (paciente.clinicaId !== clinicaId) {
      throw new ForbiddenException("Paciente fuera de su clínica");
    }

    if (ctx.rol === AppRoles.DOCTOR) {
      if (!ctx.medicoId) {
        throw new ForbiddenException("Sin médico asociado a su usuario");
      }
      const cita = await prisma.cita.findFirst({
        where: { pacienteId: paciente.id, medicoId: ctx.medicoId },
      });
      if (!cita) {
        throw new ForbiddenException(
          "Solo puede ver fichas de pacientes con cita con usted",
        );
      }
      return;
    }

    if (ctx.rol === AppRoles.PATIENT && ctx.pacienteId !== paciente.id) {
      throw new ForbiddenException("No puede ver la ficha de otro paciente");
    }
  }

  private toResponse(paciente: PacienteConFicha): FichaClinicaResponse {
    return {
      id: paciente.id,
      nombre: paciente.nombre,
      apellido: paciente.apellido,
      rut: paciente.rut,
      telefono: paciente.telefono,
      email: paciente.email,
      ficha: paciente.ficha
        ? {
            antecedentes: paciente.ficha.antecedentes,
            alergias: paciente.ficha.alergias,
            medicamentos: paciente.ficha.medicamentos,
            notasEvolucion: paciente.ficha.notasEvolucion,
          }
        : null,
    };
  }
}
