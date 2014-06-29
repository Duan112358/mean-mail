'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    passport = require('passport'),
    logger = require('mean-logger');

/**
 * Main application entry file.
 * Please note that the order of loading is important.
 */

// Initializing system variables
var config = require('./server/config/config');
var sendMail = require('./server/config/mail');
var db = mongoose.connect(config.db);
var conn = mongoose.connection;
var socketio = require('socket.io');
var cookieParser = require('cookie-parser');
var passportSocketIo = require('passport.socketio');
var http = require('http');

conn.on('error', console.log.bind(console, '**Could not connect to MongoDB. Please ensure mongod is running and restart MEAN app.**\n'));

// Bootstrap Models, Dependencies, Routes and the app as an express app
var app = require('./server/config/system/bootstrap')(passport, db);

// Start the app by listening on <port>, optional hostname
conn.once('open', function() {

    var server = http.createServer(app);
    var io = socketio(server);
    server.listen(config.port, config.hostname);

    //With Socket.io >= 1.0
    io.use(passportSocketIo.authorize({
        cookieParser: cookieParser,
        key: config.sessionName, // the name of the cookie where express/connect stores its session_id
        secret: config.sessionSecret, // the session_secret to parse the cookie
        store: app.get('session-store'), // we NEED to use a sessionstore. no memorystore please
        success: function(data, accept) {
            accept(null, true);
        }, // *optional* callback on success - read more below
        fail: function(data, message, error, accept) {
            if (error) {
                console.log(message);
            }
            accept(null, false);
        }, // *optional* callback on fail/error - read more below
    }));

    io.set('log level', 1); // reduce logging

    io.sockets.on('connection', function(socket) {

        socket.on('send-msg', function(data) {
            socket.emit('back-msg', 'I got it.');
        });

        socket.on('__send__all__mails__', function(data) {
            sendMail(data, socket);
            socket.emit('__all__sent__', 'mail all sent!');
        })
    });

    console.log('MEAN app started on port ' + config.port + ' (' + process.env.NODE_ENV + ')');

    // Initializing logger
    logger.init(app, passport, mongoose);
});

// Expose app
exports = module.exports = app;
