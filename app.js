require('dotenv').config();
const express = require('express');
const logger = require('morgan');
const path = require('path');
const app = express();
const cors = require('cors');
const corsConfig = {
    origin: "*",
    credential: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] 
};
app.options('', cors(corsConfig));
app.use(cors(corsConfig));
app.use(logger('dev'));
app.use(express.json());

const routes = require('./routes');
app.use('/api/v1', routes);
app.use('/images', express.static(path.join(__dirname, 'tmp/images')));

// 500 error handler
app.use((err, req, res, next) => {
    console.log(err);
    res.status(500).json({
        status: false,
        message: err.message
    });
});

// 404 error handler
app.use((req, res, next) => {
    res.status(404).json({
        status: false,
        message: `are you lost? ${req.method} ${req.url} is not registered!`
    });
});

module.exports = app;
