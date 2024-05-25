const express = require('express');
const router = express.Router();
const { register, login, whoami } = require('../controllers/auth.controllers');
const { getUsers, getUserById, updateUser, deleteUser, createUser } = require('../controllers/user.controller');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

let restrict = (req, res, next) => {
    let { authorization } = req.headers;
    if (!authorization || !authorization.split(' ')[1]) {
        return res.status(401).json({
            status: false,
            message: 'This user is not logged in!',
            data: null
        });
    }

    let token = authorization.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(401).json({
                status: false,
                message: err.message,
                data: null
            });
        }
        delete user.iat;
        req.user = user;
        next();
    });
};

let isAdmin = (req, res, next) => {
    if (req.user.role != 'ADMIN') {
        return res.status(401).json({
            status: false,
            message: 'only admin can access!',
            data: null
        });
    }
    next();
};

// Auth
router.post('/register', register);
router.post('/login', login);
router.get('/whoami', restrict, whoami);
router.post('/create-admin', restrict, isAdmin, (req, res, next) => { req.body.role = 'ADMIN'; next(); }, register);

// Users
router.get('/users', restrict, isAdmin, getUsers);
router.get('/user/:id', restrict, isAdmin, getUserById);
router.put('/user/:id', restrict, isAdmin, updateUser);

module.exports = router;
