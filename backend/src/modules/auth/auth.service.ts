import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/env';
import { ApiError } from '../../middleware/error.middleware';
import { signToken } from '../../utils/jwt';
import { hashPassword, verifyPassword } from '../../utils/password';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: 'customer';
  phone?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export async function register(input: RegisterInput) {
  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: await hashPassword(input.password),
        role: Role.customer,
        phone: input.phone,
      },
      select: publicUserSelect,
    });

    return { token: signToken({ userId: user.id, role: user.role }), user };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiError(400, 'An account with this email already exists');
    }
    throw error;
  }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const { passwordHash: _passwordHash, ...safeUser } = user;
  return {
    token: signToken({ userId: user.id, role: user.role }),
    user: safeUser,
  };
}
