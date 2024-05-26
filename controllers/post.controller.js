const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    getPost: async (req, res, next) => {
        try {
            let post = await prisma.post.findMany({
                select: {
                    id: true,
                    title: true,
                    content: true,
                    organizer: true,
                    eventDate: true,
                    picture: true,
                    is_event: true
                }
            });
            return res.status(200).json({
                status: true,
                message: 'OK',
                data: post
            });
        } catch (error) {
            next(error);
        }
    
    },

    getPostById: async (req, res, next) => {
        try {
            let id = parseInt(req.params.id);
            let post = await prisma.post.findUnique({
                where: { id },
                select: {
                    id: true,
                    title: true,
                    content: true,
                    organizer: true,
                    eventDate: true,
                    picture: true,
                    is_event: true
                }
            });

            let eventParticipants = await prisma.participant.findMany({
                where: { postId: id },
                select: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            std_code: true,
                            phone_number: true
                        } 
                    }
                }
            });

            if (!post) {
                return res.status(404).json({
                    status: false,
                    message: 'Post not found!',
                    data: null
                });
            }
            
            const participants = eventParticipants.map(participant => {
                return {
                    user_id: participant.user.id,
                    name: participant.user.name,
                    std_code: participant.user.std_code,
                    phone_number: participant.user.phone_number
                }
            });

            const data = {
                id: post.id,
                title: post.title,
                content: post.content,
                organizer: post.organizer,
                eventDate: post.eventDate,
                picture: post.picture,
                is_event: post.is_event,
                participants: participants
            }


            return res.status(201).json({
                status: true,
                message: 'Post created!',
                data: data
            }); 

        }
        catch (error) {
            next(error);
        }
    },

    createPost: async (req, res, next) => {
        try {
            let { title, content, organizer, eventDate, picture, is_event } = req.body;
            await prisma.post.create({
                data: {
                    title,
                    content,
                    organizer,
                    eventDate,
                    picture,
                    is_event,
                }
            });
            return res.status(201).json({
                status: true,
                message: 'Post created!',
                data: `Successfully added post with title ${title}`
            });
        } catch (error) {
            next(error);
        }
    },



};