import { Response, Request } from "express";
import { authService } from "../services/auth.service";

export const authController = {
  // POST /auth/login  { email, password }
  async login(req: Request, res: Response) {
    const result = await authService.login(req.body.email, req.body.password);
    res.json(result);
  },
};