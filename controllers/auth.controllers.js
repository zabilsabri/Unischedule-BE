const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = process.env;
const { transporter } = require('../utils/transporter');
const { generateRandomNumber } = require('../utils/pinGenerator');
const Redis = require('ioredis');
const redis = new Redis({
    host: REDIS_HOST,
    port: 17450,
    password: REDIS_PASSWORD,
    connectTimeout: 10000
});

module.exports = {

    register: async (req, res, next) => {
        try {
            let { name, std_code, gender, email, phone_number, password, role } = req.body;
            
            if (!name || !std_code || !gender || !phone_number || !email || !password) {
                return res.status(400).json({
                    status: false,
                    message: 'name, email and password are required!',
                    data: null
                });
            }

            let exist = await prisma.user.findFirst({ where: { email } });
            if (exist) {
                return res.status(400).json({
                    status: false,
                    message: 'email has already been used!',
                    data: null
                });
            }

            let encryptedPassword = await bcrypt.hash(password, 10);
            let userData = {
                name,
                std_code,
                gender,
                email,
                phone_number,
                password: encryptedPassword
            };
            if (role) userData.role = role;
            let user = await prisma.user.create({ data: userData });
            
            const pin = generateRandomNumber();
            await redis.set(user.id, pin, 'EX', 120);

            const mailOptions = {
                from: `"${process.env.EMAIL}"`,
                to: email,
                subject: 'Verify your email address!',
                text: `Your PIN is ${pin}. It will expire in 2 minutes.`
            };

            await transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return res.status(500).json({ message: 'Error sending email', error });
                }
            });

            const jwtUser = {
                id: user.id,
                role: user.role
            }

            let token = jwt.sign(jwtUser, JWT_SECRET);

            return res.status(201).json({
                status: true,
                message: `Successfully registered user with email ${user.email} and sending pin code!`,
                token: token
            });

        } catch (error) {
            if (error.code === 'P2002') {
                return res.status(400).json({
                    status: false,
                    message: 'credential that you input has already been used!',
                    data: null
                });
            };
            next(error);
        }
    },

    login: async (req, res, next) => {
        try {
            let { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({
                    status: false,
                    message: 'email and password are required!',
                    data: null
                });
            }

            let user = await prisma.user.findFirst({ where: { email } });

            if (!user) {
                return res.status(400).json({
                    status: false,
                    message: 'invalid email or password!',
                    data: null
                });
            }

            let isPasswordCorrect = await bcrypt.compare(password, user.password);
            if (!isPasswordCorrect) {
                return res.status(400).json({
                    status: false,
                    message: 'invalid email or password!',
                    data: null
                });
            }

            delete user.password;

            const jwtUser = {
                id: user.id,
                role: user.role
            }

            let token = jwt.sign(jwtUser, JWT_SECRET);

            return res.json({
                status: true,
                message: 'OK',
                token: token
            });
        } catch (error) {
            next(error);
        }
    },

    
    verifyEmail: async (req, res, next) => {
        try {
            const pin  = req.body.pin;
            const userId = req.user.id;

            let user = await prisma.user.findFirst({ where: { id: userId } });

            if (!user) {
                return res.status(400).json({
                    status: false,
                    message: 'user not found!',
                    data: null
                });
            }

            let value = await redis.get(userId);
            if (value === null) {
                return res.json({
                    status: false,
                    message: 'PIN has expired!'
                });
            } else if (value == pin) {
                await redis.del(userId);
            }

            await prisma.user.update({
                where: { id: userId },
                data: { email_verified: true }
            });

            return res.status(200).json({
                status: true,
                message: 'OK',
                data: `Successfully verified email for user with email ${user.email}!`
            });

        } catch (error) {
            next(error);
        }
    },

    resendPin: async (req, res, next) => {
        try {

            const userId = req.user.id;

            let user = await prisma.user.findFirst({ where: { id: userId } });

            if (!user) {
                return res.status(400).json({
                    status: false,
                    message: 'user not found!',
                    data: null
                });
            }

            const pin = generateRandomNumber();
            await redis.set(userId, pin, 'EX', 120);

            const mailOptions = {
                from: `"${process.env.EMAIL}"`,
                to: user.email,
                subject: 'Verify your email address!',
                text: `Your PIN is ${pin}. It will expire in 2 minutes.`
            };

            await transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return res.status(500).json({ message: 'Error sending email', error });
                }
            });

            return res.status(200).json({
                status: true,
                message: 'OK',
                data: `Successfully resend pin code for user with email ${user.email}!`
            });

        } catch (error) {
            next(error);
        }
    },

    whoami: async (req, res, next) => {
        try {

            const userId = req.user.id;

            const currentUser = await prisma.user.findFirst({ 
                where: { 
                    id: userId 
                },
                select: {
                    id: true,
                    name: true,
                    std_code: true,
                    email: true,
                    phone_number: true,
                    gender: true,
                    role: true,
                    email_verified: true
                } 
            });

            res.json({
                status: true,
                message: 'OK',
                data: currentUser
            });
        } catch (error) {
            next(error);
        }
    }
};