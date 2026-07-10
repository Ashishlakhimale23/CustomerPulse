import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";

export const ticketCategoryController = {
  // POST /departments/:departmentId/categories
  // { name, defaultSlaHours, defaultPriority, minSupportLevel }  (DEPT_ADMIN, GLOBAL_ADMIN)
  // This is where the SLA/priority defaults ticketService reads from get configured.
  async create(req: AuthedRequest, res: Response) {
    const category = await prisma.ticketCategory.create({
      data: {
        departmentId: req.params.departmentId,
        name: req.body.name,
        defaultSlaHours: req.body.defaultSlaHours,
        defaultPriority: req.body.defaultPriority,
        minSupportLevel: req.body.minSupportLevel,
      },
    });
    res.status(201).json(category);
  },

  // GET /departments/:departmentId/categories
  async list(req: AuthedRequest, res: Response) {
    const categories = await prisma.ticketCategory.findMany({
      where: { departmentId: req.params.departmentId },
    });
    res.json(categories);
  },

  // PATCH /categories/:id
  async update(req: AuthedRequest, res: Response) {
    const category = await prisma.ticketCategory.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        defaultSlaHours: req.body.defaultSlaHours,
        defaultPriority: req.body.defaultPriority,
        minSupportLevel: req.body.minSupportLevel,
      },
    });
    res.json(category);
  },
  
};
