import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { prisma } from "@agenda/database";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Public()
  @Get()
  async check() {
    let database = "up";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "down";
    }

    return {
      status: database === "up" ? "ok" : "degraded",
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
