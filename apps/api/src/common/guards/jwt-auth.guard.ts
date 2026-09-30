import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type { JwtPayload } from "@agenda/shared";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

interface RequestWithUser extends Request {
  user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Token no proporcionado");
    }

    try {
      request.user = this.jwt.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException("Token inválido o expirado");
    }

    return true;
  }

  private extractToken(request: RequestWithUser): string | undefined {
    const cookieToken = request.cookies?.["agenda_access"];
    if (cookieToken) {
      return cookieToken;
    }

    const header = request.headers.authorization;
    const [type, token] = header?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
