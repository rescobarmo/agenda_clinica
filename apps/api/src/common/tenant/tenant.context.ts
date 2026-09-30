import { AsyncLocalStorage } from "node:async_hooks";
import type { TenantContext } from "@agenda/shared";

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return tenantStorage.getStore();
}

export function requireTenantContext(): TenantContext {
  const ctx = tenantStorage.getStore();
  if (!ctx) {
    throw new Error("TenantContext no disponible en esta request");
  }
  return ctx;
}
