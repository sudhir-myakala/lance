import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto, userAgent?: string, ip?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const slug = (dto.orgSlug ?? dto.orgName)
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const slugExists = await this.prisma.org.findUnique({ where: { slug } });
    if (slugExists)
      throw new ConflictException('Organisation slug already taken');

    const ownerRole = await this.prisma.role.upsert({
      where: { name: 'owner' },
      update: {},
      create: {
        name: 'owner',
        description: 'Organisation owner with full access',
      },
    });

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');

    // Create sequentially so each ID is available for the next step
    const org = await this.prisma.org.create({
      data: { name: dto.orgName, slug },
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        emailVerifyToken,
        orgId: org.id,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        orgId: true,
      },
    });

    await this.prisma.membership.create({
      data: { userId: user.id, orgId: org.id, roleId: ownerRole.id },
    });

    return this.issueTokens(user, userAgent, ip);
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        orgId: true,
        passwordHash: true,
      },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokens(
      {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        orgId: user.orgId,
      },
      userAgent,
      ip,
    );
  }

  async refresh(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: { id: true, email: true, orgId: true, deletedAt: true },
        },
      },
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt < new Date() ||
      stored.user.deletedAt
    ) {
      throw new UnauthorizedException('Session expired — please log in again');
    }

    const accessToken = this.signAccessToken(stored.user);
    return { accessToken };
  }

  async logout(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        emailVerifiedAt: true,
        orgId: true,
        org: { select: { id: true, name: true, slug: true } },
        memberships: {
          select: { role: { select: { name: true, permissions: true } } },
        },
      },
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async issueTokens(
    user: {
      id: string;
      email: string;
      orgId: string;
      firstName?: string | null;
      lastName?: string | null;
    },
    userAgent?: string,
    ip?: string,
  ) {
    const accessToken = this.signAccessToken(user);

    const rawRefresh = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefresh);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        userAgent,
        ipAddress: ip,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        orgId: user.orgId,
      },
    };
  }

  private signAccessToken(user: { id: string; email: string; orgId: string }) {
    return this.jwt.sign(
      { sub: user.id, email: user.email, orgId: user.orgId },
      { expiresIn: '15m', secret: this.config.get<string>('JWT_SECRET') },
    );
  }

  private hashToken(token: string): string {
    return crypto
      .createHmac(
        'sha256',
        this.config.get<string>('REFRESH_TOKEN_SECRET', 'fallback'),
      )
      .update(token)
      .digest('hex');
  }
}
