const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const imageKit = require('../utils/imageKit');
const path = require('path');
const getFileId  = require('../utils/fileId');
const prisma = new PrismaClient();

module.exports = {
getUsers: async (req, res, next) => {
    try {
        let users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                std_code: true,
                gender: true,
                email: true,
                phone_number: true,
                role: true,
                profile_image: true
            }
        });
        return res.status(200).json({
            status: true,
            message: 'OK',
            data: users
        });
    } catch (error) {
        next(error);
    }
},

getUserById: async (req, res, next) => {
    try {
        let id = req.params.id;
        let user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                std_code: true,
                gender: true,
                email: true,
                phone_number: true,
                role: true,
                profile_image: true
            }
        });
        if (!user) {
            return res.status(404).json({
                status: false,
                message: 'User not found!'
            });
        }
        return res.status(200).json({
            status: true,
            message: 'OK',
            data: user
        });
    }
    catch (error) {
        next(error);
    }
},

updateUser: async (req, res, next) => {
    try {
        let id = req.params.id;
        let user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
            return res.status(404).json({
                status: false,
                message: 'User not found!'
            });
        }

        let emailChanged = user.email_verified;

        if(req.user.role != 'ADMIN' && req.user.id != user.id) {
            return res.status(401).json({
                status: false,
                message: 'You are not authorized to update this user!'
            });
        }

        let { name, std_code, gender, phone_number, email, password } = req.body;
        let url;

        if(password != null){
            password = bcrypt.hashSync(password, 10);
        }

        if(email != user.email && email != undefined){
            emailChanged = false;
        }

        if(req.file != undefined) {

            if(user.profile_image != null) {
                const filename = user.profile_image.substring(user.profile_image.lastIndexOf('/') + 1);
                await imageKit.deleteFile(await getFileId(filename));
            }

            let strFile = req.file.buffer.toString('base64');
            url = await imageKit.upload({
                fileName: Date.now() + path.extname(req.file.originalname),
                file: strFile
            });
        }
        
        const data = await prisma.user.update({
            where: { id },
            data: {
                name,
                std_code,
                gender,
                phone_number,
                profile_image: (url === undefined) ? user.profile_image : url.url,
                email,
                email_verified: emailChanged,
                password: password ?? user.password
            }
        });

        delete data.password;

        return res.status(200).json({
            status: true,
            message: `Successfully updated user with name ${user.name}!`,
            data: data
        });

    } catch (error) {
        if(error.code === 'P2002') {
            return res.status(400).json({
                status: false,
                message: 'std_code/email/phone_number that you input, is already in database!'
            });
        }
        next(error);
    }
},

deleteUser: async (req, res, next) => {
    try {
        let id = req.params.id;
        let user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
            return res.status(404).json({
                status: false,
                message: 'User not found!'
            });
        }

        if(user.profile_image != null){
            const filename = user.profile_image.substring(user.profile_image.lastIndexOf('/') + 1);

            const fileId = await getFileId(filename);

            if(fileId != null){
                await imageKit.deleteFile(fileId);
            }
        }

        await prisma.user.delete({ where: { id } });

        return res.status(200).json({
            status: true,
            message: `Successfully deleted user with name ${user.name}!`
        });

    } catch (error) {
        next(error);
    }
},

createUser: async (req, res, next) => {
    try {
        let { name, std_code, gender, email, phone_number, password, role } = req.body;
            
        if (!name || !gender || !phone_number || !email || !password) {
            return res.status(400).json({
                status: false,
                message: 'name, email, gender, phone_number and password are required!'
            });
        }

        let exist = await prisma.user.findFirst({ where: { email } });
        if (exist) {
            return res.status(400).json({
                status: false,
                message: 'email has already been used!'
            });
        }

        let url;
        if(req.file != undefined) {
            let strFile = req.file.buffer.toString('base64');
            url = await imageKit.upload({
                fileName: Date.now() + path.extname(req.file.originalname),
                file: strFile
            });
        }

        let encryptedPassword = await bcrypt.hash(password, 10);
        let userData = {
            name,
            std_code,
            gender,
            email,
            phone_number,
            password: encryptedPassword,
            profile_image: (url === undefined) ? null : url.url
        };

        if (role) userData.role = role;
        let user = await prisma.user.create({ data: userData });
        delete user.password;

        return res.status(201).json({
            status: true,
            message: `Successfully registered user with email ${user.email}!`,
            data: user
        });

    } catch (error) {
        if(error.code === 'P2002') {
            return res.status(400).json({
                status: false,
                message: 'std_code/email/phone_number that you input, is already in database!'
            });
        }
        next(error);
    }
}


};