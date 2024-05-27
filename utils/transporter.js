const nodemailer = require('nodemailer');
const { EMAIL, PASSWORD } = process.env;

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL,
        pass: PASSWORD
    }
});

module.exports = { transporter };