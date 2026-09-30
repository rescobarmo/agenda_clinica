export interface AuthUser {
  sub: string;
  rol: string;
  clinica_id?: string;
  sucursal_id?: string;
  medico_id?: string;
  paciente_id?: string;
}

export interface Cita {
  id: string;
  fecha: string;
  estado: string;
  duracionMinutos: number;
  origen: string;
  medico: { id: string; nombre: string } | null;
  paciente: { id: string; nombre: string; apellido: string | null } | null;
  sucursal: { id: string; nombre: string } | null;
}

export interface FichaClinica {
  antecedentes: string | null;
  alergias: string | null;
  medicamentos: string | null;
  notasEvolucion: string | null;
}

export interface PacienteFicha {
  id: string;
  nombre: string;
  apellido: string | null;
  rut: string | null;
  telefono: string | null;
  email: string | null;
  ficha: FichaClinica | null;
}
