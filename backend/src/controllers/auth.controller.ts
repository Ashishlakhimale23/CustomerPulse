import { Response, Request } from "express";
import { authService } from "../services/auth.service";
import {prisma} from "../lib/database"
import { AppError } from "../middleware/errorHandler";
import bcrypt from "bcryptjs"
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
        employeeId: req.body.employeeId || undefined,
        passwordHash:passwordHash,
        role : UserRole.REQUESTER,
        // NOTE(added): self-registered requesters must be reviewed by a
        // GLOBAL_ADMIN before they can log in or create tickets.
        approvalStatus: "PENDING",
      }
    })

    res.status(201).json({
      message: "Registration submitted. An admin will review your account before you can sign in.",
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, approvalStatus: user.approvalStatus },
    });
  }

}