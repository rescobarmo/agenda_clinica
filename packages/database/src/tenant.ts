import { prisma, type PrismaClient } from "./index";

export const RLS_TENANT_VAR = "app.current_clinica_id";
export const RLS_USER_VAR = "app.current_user_id";

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function setTenantContext(
  client: PrismaClient | TxClient,
  clinicaId: string,
  userId?: string,
): Promise<void> {
  await client.$executeRawUnsafe(
    `SELECT set_config('${RLS_TENANT_VAR}', $1, true)`,
    clinicaId,
  );
  if (userId) {
    await client.$executeRawUnsafe(
      `SELECT set_config('${RLS_USER_VAR}', $1, true)`,
      userId,
    );
  }
}

export async function withTenant<T>(
  clinicaId: string,
  userId: string | undefined,
  fn: (tx: TxClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await setTenantContext(tx, clinicaId, userId);
    return fn(tx);
  });
}
