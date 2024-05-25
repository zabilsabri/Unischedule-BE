const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

(async () => {

    const password = bcrypt.hashSync('password123', 10);

    const admin = await prisma.user.upsert({
        where: {
            email: 'admin@gmail.com'
        },
        update: {},
        create: {
            name: 'admin',
            email: 'admin@gmail.com',
            password: password,
            gender: "MALE",
            phone_number: '081234567890',
            role: 'ADMIN'
        }
    });
})();