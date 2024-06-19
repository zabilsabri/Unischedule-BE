const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {toBoolean} = require('../utils/toBoolean');
const fs = require('fs');
const imageKit = require('../utils/imageKit');
const path = require('path');
const getFileId  = require('../utils/fileId');
const admin = require('firebase-admin');
const fcm = require('fcm-node');

const serviceAccount = require('../config/push-notification-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

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

            eventDate = eventDate == "null" ? null : eventDate;

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

            const tokens = await prisma.fcp_device.findMany({
                select: {
                    token: true
                }
            });

            const message = {
                notification: {
                    title: title,
                    body: content,
                },
                tokens: tokens,
            };

            const response = await admin.messaging().sendMulticast(message);
            console.log(`${response.successCount} messages were sent successfully`);
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.log(`Failed to send message to ${tokens[idx]}: ${resp.error}`);
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

            const fileId = await getFileId(filename);

            if(fileId != null){
                await imageKit.deleteFile(fileId);
            }

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
    },

    getPostByUserId: async (req, res, next) => {
        try {
            let userId = req.user.id;
            let posts = await prisma.post.findMany({
                select: {
                    id: true,
                    title: true,
                    content: true,
                    organizer: true,
                    eventDate: true,
                    picture: true,
                    is_event: true,
                    Participants: {
                        select: {
                            user: {
                                select: {
                                    id: true
                                }
                            }
                        }
                    }
                }
            });

            const rawData = posts.map(post => {
                return {
                    id: post.id,
                    title: post.title,
                    content: post.content,
                    organizer: post.organizer,
                    eventDate: post.eventDate,
                    picture: post.picture,
                    is_event: post.is_event,
                    participants: post.Participants.map(participant => {
                        if(participant.user.id === userId){
                            return {
                                is_registered: true
                            }
                        }
                    })
                }
            });

            const data = rawData.map(post => {
                return {
                    id: post.id,
                    title: post.title,
                    content: post.content,
                    organizer: post.organizer,
                    eventDate: post.eventDate,
                    picture: post.picture,
                    is_event: post.is_event,
                    is_registered: post.participants.some(participant => participant.is_registered === true)
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

    testNotif: async (req, res, next) => {
        try {
            const { token, title, body } = req.body;

            const message = {
                notification: {
                    title: title,
                    body: body,
                },
                token: token,
            };
        
            try {
                const response = await admin.messaging().send(message);
                return res.status(200).json({
                    status: true,
                    message: 'Notification sent!',
                    data: response
                });
            } catch (error) {
                return res.status(500).send({ error: error.message });
            }
        } catch (error) {
            next(error);
        }
    }

};