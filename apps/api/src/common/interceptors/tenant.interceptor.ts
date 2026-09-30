import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import type { JwtPayload, TenantContext } from "@agenda/shared";
import { tenantStorage } from "../tenant/tenant.context";

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: JwtPayload }>();

    const tenantContext = this.buildTenantContext(request.user);

    if (!tenantContext) {
      return next.handle();
    }

    return tenantStorage.run(tenantContext, () => next.handle());
  }

  private buildTenantContext(user?: JwtPayload): TenantContext | undefined {
    if (!user) {
      return undefined;
    }

    return {
      clinicaId: user.clinica_id,
      sucursalId: user.sucursal_id,
      medicoId: user.medico_id,
      pacienteId: user.paciente_id,
      userId: user.sub,
      rol: user.rol,
    };
  }
}
