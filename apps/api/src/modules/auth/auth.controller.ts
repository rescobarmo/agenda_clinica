import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import type { AuthTokens, JwtPayload } from "@agenda/shared";
import { Public } from "../../common/decorators/public.decorator";
import { AuthService, type SessionMeta } from "./auth.service";
import { LoginDto, RefreshTokenDto } from "./dto/login.dto";

const ACCESS_COOKIE = "agenda_access";
const REFRESH_COOKIE = "agenda_refresh";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post("login")
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.login(dto.email, dto.password, this.meta(req));
    this.setAuthCookies(res, tokens);
    return { ok: true };
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = this.extractRefreshToken(req, dto);
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token no proporcionado");
    }

    const tokens = await this.auth.refresh(refreshToken, this.meta(req));
    this.setAuthCookies(res, tokens);
    return { ok: true };
  }

  @Public()
  @Post("logout")
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (refreshToken) {
      await this.auth.logout(refreshToken);
    }

    this.clearAuthCookies(res);
    return { ok: true };
  }

  @ApiBearerAuth()
  @Get("me")
  me(@Req() req: { user: JwtPayload }): JwtPayload {
    return req.user;
  }

  private extractRefreshToken(
    req: Request,
    dto: RefreshTokenDto,
  ): string | undefined {
    return req.cookies?.[REFRESH_COOKIE] ?? dto.refreshToken;
  }

  private meta(req: Request): SessionMeta {
    return {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    };
  }

  private setAuthCookies(res: Response, tokens: AuthTokens): void {
    const secure = this.config.get<string>("NODE_ENV") === "production";
    const accessTtl = this.config.get<number>("JWT_ACCESS_TTL") ?? 900;
    const refreshTtl = this.config.get<number>("JWT_REFRESH_TTL") ?? 604800;

    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: accessTtl * 1000,
    });

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: refreshTtl * 1000,
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, { path: "/" });
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  }
}
