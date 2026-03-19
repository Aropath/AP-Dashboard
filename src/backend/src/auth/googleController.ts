import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { verifyGoogleToken } from "./googleAuth";
import { db } from "../db"; // your database layer

export async function googleLogin(req: Request, res: Response) {
    try {
        const { token } = req.body;

        const userData = await verifyGoogleToken(token);

        let user = await db.user.findUnique({
            where: { email: userData.email },
        });

        if (!user) {
            user = await db.user.create({
                data: {
                    email: userData.email,
                    name: userData.name,
                    googleId: userData.googleId,
                    image: userData.picture,
                },
            });
        }

        if (!user) {
            throw new Error("Failed to create or retrieve user");
        }

        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            throw new Error("JWT_SECRET not defined in environment variables");
        }

        const sessionToken = jwt.sign(
            { userId: user.id },
            jwtSecret,
            { expiresIn: "7d" }
        );

        res.json({
            token: sessionToken,
            user,
        });

    } catch (err) {
        res.status(401).json({ error: "Google authentication failed" });
    }
}