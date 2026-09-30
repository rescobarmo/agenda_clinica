import { PrismaClient, Role } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

const CLINICA_ID = "11111111-1111-4111-8111-111111111111";
const SUCURSAL_ID = "22222222-2222-4222-8222-222222222222";
const ESPECIALIDAD_ID = "33333333-3333-4333-8333-333333333333";
const MEDICO_ID = "44444444-4444-4444-8444-444444444444";
const PACIENTE_ID = "55555555-5555-4555-8555-555555555555";

async function main() {
  const clinica = await prisma.clinica.upsert({
    where: { id: CLINICA_ID },
    update: {},
    create: {
      id: CLINICA_ID,
      nombre: "Clínica Demo",
      rut: "99.999.999-9",
    },
  });

  const sucursal = await prisma.sucursal.upsert({
    where: { id: SUCURSAL_ID },
    update: {},
    create: {
      id: SUCURSAL_ID,
      clinicaId: clinica.id,
      nombre: "Sucursal Centro",
    },
  });

  const passwordHash = await hash("Admin123!", {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  await prisma.usuario.upsert({
    where: { email: "admin@agenda.demo" },
    update: {},
    create: {
      email: "admin@agenda.demo",
      passwordHash,
      nombre: "Super Admin",
      rol: Role.SUPER_ADMIN,
    },
  });

  const especialidad = await prisma.especialidad.upsert({
    where: { id: ESPECIALIDAD_ID },
    update: {},
    create: {
      id: ESPECIALIDAD_ID,
      nombre: "Medicina General",
      duracionMinutos: 30,
    },
  });

  const medico = await prisma.medico.upsert({
    where: { id: MEDICO_ID },
    update: {},
    create: {
      id: MEDICO_ID,
      clinicaId: clinica.id,
      nombre: "Dr. Demo",
      registroProfesional: "REG-0001",
      especialidades: { connect: [{ id: especialidad.id }] },
    },
  });

  const paciente = await prisma.paciente.upsert({
    where: { id: PACIENTE_ID },
    update: {},
    create: {
      id: PACIENTE_ID,
      clinicaId: clinica.id,
      nombre: "Paciente",
      apellido: "Demo",
      rut: "11.111.111-1",
      telefono: "+56911111111",
      email: "paciente@agenda.demo",
    },
  });

  await prisma.fichaClinica.upsert({
    where: { pacienteId: PACIENTE_ID },
    update: {},
    create: {
      pacienteId: PACIENTE_ID,
      antecedentes: "Hipertensión arterial diagnosticada en 2020.",
      alergias: "Penicilina.",
      medicamentos: "Losartán 50 mg/día.",
      notasEvolucion: "Control de rutina; paciente estable.",
    },
  });

  for (let diaSemana = 0; diaSemana <= 6; diaSemana++) {
    const id = `66666666-6666-4666-8666-6666666666${String(diaSemana).padStart(2, "0")}`;
    await prisma.disponibilidad.upsert({
      where: { id },
      update: {},
      create: {
        id,
        medicoId: medico.id,
        sucursalId: sucursal.id,
        diaSemana,
        horaInicio: "09:00",
        horaFin: "13:00",
        vigenteDesde: new Date("2026-01-01"),
      },
    });
  }

  console.log(
    `Seed completado. Clínica: ${clinica.id}, Sucursal: ${sucursal.id}, Médico: ${medico.id}, Paciente: ${paciente.id}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
