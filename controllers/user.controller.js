const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
getUsers: async (req, res, next) => {
    try {
        let users = await prisma.user.findMany({
            where: {
                role: 'USER'
            },
            select: {
                id: true,
                name: true,
                std_code: true,
                gender: true,
                email: true,
                phone_number: true,
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
        let id = parseInt(req.params.id);
        let user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                std_code: true,
                gender: true,
                email: true,
                phone_number: true,
            }
        });
        if (!user) {
            return res.status(404).json({
                status: false,
                message: 'User not found!',
                data: null
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
        let id = parseInt(req.params.id);
        let user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
            return res.status(404).json({
                status: false,
                message: 'User not found!',
                data: null
            });
        }

        let { name, std_code, gender, email, phone_number } = req.body;
        
        try {
            await prisma.user.update({
                where: { id },
                data: {
                    name,
                    std_code,
                    gender,
                    email,
                    phone_number
                }
            });

            return res.status(200).json({
                status: true,
                message: 'OK',
                data: `Successfully updated user with name ${user.name}!`
            });
        } catch (error) {
            if (error instanceof prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                // This error code indicates a unique constraint violation
                let conflictField = error.meta.target;

                return res.status(409).json({
                    status: false,
                    message: `Conflict: ${conflictField} already exists.`,
                    data: null
                });
            } else {
                throw error; // Re-throw other errors to be handled by the outer catch block
            }
        }

    } catch (error) {
        next(error);
    }
},

deleteUser: async (req, res, next) => {
    try {
        let id = parseInt(req.params.id);
        let user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
            return res.status(404).json({
                status: false,
                message: 'User not found!',
                data: null
            });
        }

        await prisma.user.delete({ where: { id } });

        return res.status(200).json({
            status: true,
            message: 'OK',
            data: `Successfully deleted user with name ${user.name}!`
        });

    } catch (error) {
        next(error);
    }
},

createUser: async (req, res, next) => {
    try {
        let { name, std_code, gender, email, phone_number, password, role } = req.body;
            
        if (!name || !std_code || !gender || !phone_number || !email || !password || !role) {
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
        delete user.password;

        return res.status(201).json({
            status: true,
            message: 'OK',
            data: `Successfully registered user with email ${user.email}!`
        });

    } catch (error) {
        
    }
}


};