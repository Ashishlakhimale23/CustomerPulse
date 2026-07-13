import { Response, Request } from "express";
import { authService } from "../services/auth.service";
import {prisma} from "../lib/database"
import { AppError } from "../middleware/errorHandler";
import bcrypt from "bcryptjs"
import { signAuthToken } from "../utils/jwt";
import { UserRole } from "../generated/prisma/enums";

export const authController = {
  // POST /auth/login  { email, password }
  async login(req: Request, res: Response) {
    const result = await authService.login(req.body.email, req.body.password);
    res.json(result);
  },

  async signup(req: Request, res: Response) {
    const checkuser = await prisma.user.findUnique({ where: { email:req.body.email } });

    // Same error for "no such user" and "wrong password" so login can't
    // be used to enumerate which emails exist in the system.
    if (checkuser) {
      throw new AppError("User exists already", 401);
    }

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.create({
      data:{
        fullName:req.body.fullName,
        email : req.body.email,
        passwordHash:passwordHash,
        role : UserRole.REQUESTER
      }
    })

    const token = signAuthToken({
      id: user.id,
      role: user.role,
    });

    const result = {
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    };

    res.json(result)
  }

}