import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { invitationService, InvitationError } from "../services/invitation.service";
import { prisma } from "../lib/database";

// No try/catch needed here - routes wrap these in asyncHandler, and
// InvitationError is caught centrally by middleware/errorHandler.ts.
export const invitationController = {
  // POST /invitations  (GLOBAL_ADMIN, DEPT_ADMIN)
  // @ts-ignore
  async create(req: AuthedRequest, res: Response) {
    try {
      const inviter = req.user
      if (inviter == undefined || !inviter || inviter == null) {
        return res.status(401).json({ message: "no inviter found" })
      }

      // take stae if agenta
      const invitation = await invitationService.createInvitation({
        inviter: {
          id: inviter.id,
          role: inviter.role,
        },
        email: req.body.email,
        role: req.body.role,
        name: req.body.name,
        state : req.body.state,
        windCategory: req.body.role === "AGENT" ? (req.body.windCategory || null) : null,
        departmentId: req.body.departmentId,
        departmentIds : req.body.departmentIds,
        categoryIds: req.body.categoryIds,
        supportLevel: req.body.supportLevel,
      });
      res.status(201).json({
        message:
          "Successfully send invite"
      });

    } catch (error) {
      console.log(error)
      //@ts-ignore
      return res.status(401).json(error.message)

    }

  },

  // POST /invitations/bulk  (GLOBAL_ADMIN, DEPT_ADMIN)
  // Bulk version of `create` above - same role/department/category/state/
  // windCategory settings are applied to every row (exactly what the
  // "Onboard Staff Member" form already collects once), only the name+email
  // pairs vary per row. Reuses invitationService.createInvitation per row,
  // so validation, password pre-set, and the invite email are identical to
  // a single invite. Does not touch `create`/`accept` at all.
  async bulkCreate(req: AuthedRequest, res: Response) {
    const inviter = req.user;
    if (!inviter) {
      return res.status(401).json({ message: "no inviter found" });
    }

    const {
      role,
      requestors,
      state,
      windCategory,
      departmentId,
      departmentIds,
      categoryIds,
      supportLevel,
    } = req.body;

    if (!role) {
      return res.status(400).json({ message: "role is required" });
    }
    if (!Array.isArray(requestors) || requestors.length === 0) {
      return res.status(400).json({ message: "No rows were provided" });
    }

    const created: string[] = [];
    const skipped: { name: string; email: string; reason: string }[] = [];
    const seenInFile = new Set<string>();

    for (const raw of requestors) {
      const name = typeof raw?.name === "string" ? raw.name.trim() : "";
      const email = typeof raw?.email === "string" ? raw.email.trim().toLowerCase() : "";

      if (!name || !email) {
        skipped.push({ name, email, reason: "Missing name or email" });
        continue;
      }
      if (seenInFile.has(email)) {
        skipped.push({ name, email, reason: "Duplicate row in uploaded file" });
        continue;
      }
      seenInFile.add(email);

      try {
        await invitationService.createInvitation({
          inviter: { id: inviter.id, role: inviter.role },
          email,
          role,
          name,
          state: role === "AGENT" ? (state || "") : "",
          windCategory: role === "AGENT" ? (windCategory || null) : null,
          departmentId: departmentId || "",
          departmentIds: departmentIds || [],
          categoryIds: categoryIds || [],
          supportLevel,
        });
        created.push(email);
      } catch (err) {
        //@ts-ignore
        const reason = err instanceof InvitationError ? err.message : (err?.message || "Could not invite this row");
        skipped.push({ name, email, reason });
      }
    }

    return res.status(200).json({
      totalRows: requestors.length,
      createdCount: created.length,
      skippedCount: skipped.length,
      created,
      skipped,
    });
  },

  // POST /invitations/accept  (public - invitee lands here from the emailed link)
  // Creates the account AND logs them in, same as a signup+login combo.
  async accept(req: AuthedRequest, res: Response) {
    const { user, token } = await invitationService.acceptInvitation({
      token: req.body.token,
      fullName: req.body.fullName,
      password: req.body.password,
    });
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role,departments : [...user.managedDepartments.map(dept => dept.id),...user.coxDepartements.map(dept => dept.id),user.assignedDepartment?.id] },
    });
  },

  // GET /invitations (GLOBAL_ADMIN, DEPT_ADMIN)
  async list(req: AuthedRequest, res: Response) {
    const invitations = await prisma.invitation.findMany({
      orderBy: { createdAt: "desc" },
      select:{
        id : true,
        role : true,
        email: true,
        status : true,
        department:{
          select:{
            name : true
          }
        }
      }
    });
    res.json(invitations);
  },

  // POST /invitations/:id/resend
  async resend(req: AuthedRequest, res: Response) {
    const invitation = await invitationService.resendInvitation(req.params.id);
    res.json(invitation);
  },

  // POST /invitations/:id/cancel
  async cancel(req: AuthedRequest, res: Response) {
    const invitation = await invitationService.cancelInvitation(req.params.id);
    res.json(invitation);
  },
};
