import { createHash, randomBytes } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { verify } from "@node-rs/argon2";
import { prisma, type Usuario } from "@agenda/database";
import type { AuthTokens, JwtPayload } from "@agenda/shared";

const REFRESH_TOKEN_BYTES = 48;

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(
    email: string,
    password: string,
    meta: SessionMeta,
  ): Promise<AuthTokens> {
    const user = await prisma.usuario.findUnique({ where: { email } });

    if (!user || !user.activo) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    const valid = await verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    return this.issueSession(user, meta);
  }

  async refresh(
    refreshToken: string,
    meta: SessionMeta,
  ): Promise<AuthTokens> {
    const refreshTokenHash = this.hashToken(refreshToken);

    const session = await prisma.sesion.findUnique({
      where: { refreshTokenHash },
    });
    if (!session || session.revokedAt) {
      throw new UnauthorizedException("Sesión inválida");
    }
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException("Sesión expirada");
    }

    await prisma.sesion.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const user = await prisma.usuario.findUnique({
      where: { id: session.usuarioId },
    });
    if (!user || !user.activo) {
      throw new UnauthorizedException("Usuario no encontrado");
    }

    return this.issueSession(user, meta);
  }

  async logout(refreshToken: string): Promise<void> {
    const refreshTokenHash = this.hashToken(refreshToken);

    await prisma.sesion.updateMany({
      where: { refreshTokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueSession(
    user: Usuario,
    meta: SessionMeta,
  ): Promise<AuthTokens> {
    const accessToken = this.signAccessToken(user);
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
    const refreshTokenHash = this.hashToken(refreshToken);

    const refreshTtl = this.config.get<number>("JWT_REFRESH_TTL") ?? 604800;
    const expiresAt = new Date(Date.now() + refreshTtl * 1000);

    await prisma.sesion.create({
      data: {
        usuarioId: user.id,
        refreshTokenHash,
        userAgent: meta.userAgent,
        ip: meta.ip,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private signAccessToken(user: Usuario): string {
    const payload: Omit<JwtPayload, "iat" | "exp"> = {
      sub: user.id,
      rol: user.rol,
      clinica_id: user.clinicaId ?? undefined,
      sucursal_id: user.sucursalId ?? undefined,
      medico_id: user.medicoId ?? undefined,
      paciente_id: user.pacienteId ?? undefined,
    };

    return this.jwt.sign(payload, {
      expiresIn: this.config.get<number>("JWT_ACCESS_TTL"),
    });
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
