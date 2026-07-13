import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/database";
import { AppError } from "../middleware/errorHandler";

export const clientController = {



    async getClients(req: AuthedRequest, res: Response) {
        try {
            const clients = await prisma.client.findMany({
                orderBy: {
                    createdAt: "desc",
                },
            });

            return res.status(200).json({
                success: true,
                count: clients.length,
                data: clients,
            });
        } catch (error) {
            console.error("Get Clients Error:", error);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
            });
        }


    },

    async createClient(req: AuthedRequest, res: Response) {
        try {
            const { name,projectName } = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Client name is required",
                });
            }

            // check if the client already exists or not 

            const existCheck = await prisma.client.findFirst({
                where:{
                    name : name.trim().toUpperCase()
                }
            })

            if (existCheck) {
                throw new AppError("The client already eixts", 401);
            }

            const client = await prisma.client.create({
                data: {
                    name: name.trim().toUpperCase(),
                    projectName :projectName.trim().toUpperCase(), 
                },
            });

            return res.status(201).json({
                success: true,
                message: "Client created successfully",
                data: client,
            });

        } catch (error) {
            console.error("Create Client Error:", error);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
            });
        }
    },

    async updateClient(req: AuthedRequest, res: Response) {
        try {
            const { id } = req.params;
            const { name,projectName } = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Client name is required",
                });
            }

            const existingClient = await prisma.client.findUnique({
                where: { id },
            });

            if (!existingClient) {
                throw new AppError("The client already eixts", 401);
            }

            const updatedClient = await prisma.client.update({
                where: { id },
                data: {
                    name: name.trim().toUpperCase(),
                    projectName: projectName.trim().toUpperCase()
                },
            });

            return res.status(200).json({
                success: true,
                message: "Client updated successfully",
                data: updatedClient,
            });
        } catch (error) {
            console.error("Update Client Error:", error);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
            });
        }
    },

    async deleteClient(req:AuthedRequest,res:Response){
        try {
            const { id } = req.params;

            const existingClient = await prisma.client.findUnique({
                where: { id },
            });

            if (!existingClient) {
                throw new AppError("The client doenst eixts", 401);
            }

            await prisma.client.delete({
                where: { id },
            });

            return res.status(200).json({
                success: true,
                message: "Client deleted successfully",
            });
        } catch (error) {
            console.error("Delete Client Error:", error);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
            });
        }

    }

}


