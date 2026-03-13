import bcrypt from "bcryptjs";
import prisma from "../utils/prisma";
import { generateToken } from "../middleware/auth";
import { ConflictError, UnauthorizedError } from "../utils/errors";
import { logActivity } from "./activityLog.service";

export async function register(
  email: string,
  password: string,
  name: string
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError("Email already registered");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name },
  });

  await logActivity(user.id, "REGISTERED", "USER", user.id, "Account created");

  const token = generateToken({ id: user.id, email: user.email, name: user.name });
  return {
    user: { id: user.id, email: user.email, name: user.name },
    token,
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  await logActivity(user.id, "LOGGED_IN", "USER", user.id, "User logged in");

  const token = generateToken({ id: user.id, email: user.email, name: user.name });
  return {
    user: { id: user.id, email: user.email, name: user.name },
    token,
  };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return user;
}
