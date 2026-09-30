import type { Role } from "./constants";

export interface TenantContext {
  clinicaId?: string;
  sucursalId?: string;
  medicoId?: string;
  pacienteId?: string;
  userId: string;
  rol: Role;
}

export interface JwtPayload {
  sub: string;
  rol: Role;
  clinica_id?: string;
  sucursal_id?: string;
  medico_id?: string;
  paciente_id?: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type Paginated<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
};
