import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { requireTenantContext } from "../tenant/tenant.context";

export const CurrentTenant = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext) => {
    return requireTenantContext();
  },
);
