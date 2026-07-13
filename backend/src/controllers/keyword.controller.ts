import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { keywordService } from "../services/keyword.service";
import { prisma } from "../lib/database";

export const keywordController = {
  // POST /keywords  { departmentId, name, synonyms }  (admin creating a keyword directly)
  async create(req: AuthedRequest, res: Response) {
    const keyword = await prisma.keyword.create({
      data: {
        departmentId: req.body.departmentId,
        name: req.body.name,
        description: req.body.description,
        synonyms: req.body.synonyms ?? [],
      },
    });
    res.status(201).json(keyword);
  },

  // GET /keywords?departmentId=
  async list(req: AuthedRequest, res: Response) {
    const keywords = await prisma.keyword.findMany({
      where: { departmentId: req.query.departmentId as string },
      include: { agents: { include: { user: true } } },
    });
    res.json(keywords);
  },

  async delete(req:AuthedRequest,res:Response){
    const deleteKeyword = await prisma.keyword.delete({
      where:{id:req.params.id}
    })
    res.status(200).json({message:"keyword deleted"})
  },

  // POST /keywords/agents/:userId/skills  { keywordIds: [] }  (admin onboarding an agent)
  async assignSkills(req: AuthedRequest, res: Response) {
    const result = await keywordService.assignSkillsToAgent(req.params.userId, req.body.keywordIds);
    res.json(result);
  },

  // DELETE /keywords/agents/:userId/skills/:keywordId
  async removeSkill(req: AuthedRequest, res: Response) {
    await prisma.userKeyword.delete({
      where: { userId_keywordId: { userId: req.params.userId, keywordId: req.params.keywordId } },
    });
    res.status(204).send();
  },

  // GET /keywords/departments/:departmentId/suggestions?status=PENDING
  async listSuggestions(req: AuthedRequest, res: Response) {
    const suggestions = await keywordService.listSuggestions(req.params.departmentId, req.query.status as any);
    res.json(suggestions);
  },

  // POST /keywords/suggestions/:id/promote  { name?, synonyms?, grantToUserIds? }
  async promoteSuggestion(req: AuthedRequest, res: Response) {
    const keyword = await keywordService.promoteSuggestion({
      suggestionId: req.params.id,
      reviewedById: req.user!.id,
      name: req.body.name,
      synonyms: req.body.synonyms,
      grantToUserIds: req.body.grantToUserIds,
    });
    res.status(201).json(keyword);
  },

  // POST /keywords/suggestions/:id/reject
  async rejectSuggestion(req: AuthedRequest, res: Response) {
    const suggestion = await keywordService.rejectSuggestion(req.params.id, req.user!.id);
    res.json(suggestion);
  },
};
