import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";

export const departmentController = {
  // POST /departments  { name, description }  (GLOBAL_ADMIN only)
  async create(req: AuthedRequest, res: Response) {
    const department = await prisma.department.create({
      data: {
        name: req.body.name,
        description: req.body.description,
      },
    });
    res.status(201).json(department);
  },

  // GET /departments
  async list(req: AuthedRequest, res: Response) {
    const departments = await prisma.department.findMany({
      include: { _count: { select: { users: true, tickets: true } } },
    });
    res.json(departments);
  },

  // GET /departments/:id
  // @ts-ignore
  async getById(req: AuthedRequest, res: Response) {
    const department = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: { users: true, categories: true, keywords: true },
    });
    if (!department) return res.status(404).json({ error: "Not found" });
    res.json(department);
  },

  // PATCH /departments/:id  { name?, description? }  (GLOBAL_ADMIN only)
  async update(req: AuthedRequest, res: Response) {
    const department = await prisma.department.update({
      where: { id: req.params.id },
      data: { name: req.body.name, description: req.body.description },
    });
    res.json(department);
  },
};
