const { PrismaClient } = require('@prisma/client');
const { witaTime } = require('../utils/witaTime');
const prisma = new PrismaClient();

module.exports = {
    registerEvent: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const emailStatus = await prisma.user.findFirst({
                where: {
                    id: userId
                }, select: { email_verified: true }
            });

            if (!emailStatus) {
                return res.status(404).json({
                    status: false,
                    message: 'User Not Found!'
                });
            }

            if (!emailStatus.email_verified) {
                return res.status(400).json({
                    status: false,
                    message: 'Email not verified!'
                });
            }

            const checkParticipant = await prisma.participant.findFirst({
                where: {
                    userId: userId,
                    postId: req.body.event_id
                }
            });

            if (checkParticipant) {
                return res.status(400).json({
                    status: false,
                    message: 'You already registered this event!'
                });
            }

            let data = await prisma.participant.create({
                data: {
                    user: {
                        connect: { id: userId }
                    },
                    post: {
                        connect: { id: req.body.event_id }
                    },
                    createdAt: witaTime()
                }
            });
            return res.status(200).json({
                status: true,
                message: 'OK',
                data: data
            });

        } catch (error) {
            next(error);
        }
    
    },
}