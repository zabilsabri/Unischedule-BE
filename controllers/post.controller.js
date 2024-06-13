const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {toBoolean} = require('../utils/toBoolean');
const fs = require('fs');
const imageKit = require('../utils/imageKit');
const path = require('path');
const getFileId  = require('../utils/fileId');
const { get } = require('https');
const { url } = require('inspector');

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
            let id = req.params.id;
            
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

            if (!post) {
                return res.status(404).json({
                    status: false,
                    message: 'Post not found!'
                });
            }

            const data = {
                id: post.id,
                title: post.title,
                content: post.content,
                organizer: post.organizer,
                eventDate: post.eventDate,
                picture: post.picture,
                is_event: post.is_event
            }


            return res.status(201).json({
                status: true,
                message: 'Post fetch successfully!',
                data: data
            }); 

        }
        catch (error) {
            next(error);
        }
    },

    getPostParticipantById: async (req, res, next) => {
        try {
            let id = req.params.id;
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
                    message: 'Post not found!'
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
                message: 'Post fetch successfully!',
                data: data
            }); 

        }
        catch (error) {
            next(error);
        }
    },

    createPost: async (req, res, next) => {
        try {
            let { title, content, organizer, eventDate, is_event } = req.body;
            let strFile = req.file.buffer.toString('base64');

            let { url } = await imageKit.upload({
                fileName: Date.now() + path.extname(req.file.originalname),
                file: strFile
            });

            const data = await prisma.post.create({
                data: {
                    title,
                    content,
                    organizer,
                    eventDate,
                    picture: url,
                    is_event: toBoolean(is_event),
                }
            });
            return res.status(201).json({
                status: true,
                message: 'Post created!',
                data: {
                    id: data.id,
                    title: data.title,
                    content: data.content,
                    organizer: data.organizer,
                    eventDate: data.eventDate,
                    picture: data.picture,
                    is_event: data.is_event
                }
            });
        } catch (error) {
            next(error);
        }
    },

    updatePost: async (req, res, next) => {
        try {
            let id = req.params.id;
            let { title, content, organizer, eventDate, is_event } = req.body;
            let url;

            const oldPost = await prisma.post.findUnique({
                where: { id },
                select: { picture: true }
            });

            if (!oldPost) {
                return res.status(404).json({
                    status: false,
                    message: 'Post not found!'
                });
            };

            if(req.file != undefined){

                const filename = oldPost.picture.substring(oldPost.picture.lastIndexOf('/') + 1);
                await imageKit.deleteFile(await getFileId(filename));

                let strFile = req.file.buffer.toString('base64');
                url = await imageKit.upload({
                    fileName: Date.now() + path.extname(req.file.originalname),
                    file: strFile
                });

            }

            let post = await prisma.post.update({
                where: { id },
                data: {
                    title,
                    content,
                    organizer,
                    eventDate,
                    picture: (url === undefined) ? oldPost.picture : url.url,
                    is_event: toBoolean(is_event)
                }
            });

            return res.status(200).json({
                status: true,
                message: 'Post Updated!',
                data: {
                    id: post.id,
                    title: post.title,
                    content: post.content,
                    organizer: post.organizer,
                    eventDate: post.eventDate,
                    picture: (url === undefined) ? oldPost.picture : url.url,
                    is_event: post.is_event
                }
            });
        } catch (error) {
            next(error);
        }
    },

    deletePost: async (req, res, next) => {
        try {
            let id = req.params.id;

            const post = await prisma.post.findUnique({
                where: { id },
                select: { picture: true }
            });

            const filename = post.picture.substring(post.picture.lastIndexOf('/') + 1);
            await imageKit.deleteFile(await getFileId(filename));

            await prisma.post.delete({
                where: { id }
            });
            return res.status(200).json({
                status: true,
                message: 'Post deleted!'
            });
        } catch (error) {
            next(error);
        }
    }

};