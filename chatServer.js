
// Author: Sergio Castaño Arteaga
// Email: sergio.castano.arteaga@gmail.com

// ***************************************************************************
// General
// ***************************************************************************

var conf = {
    port: 8888,
    debug: false,
    dbPort: 6379,
    dbHost: '127.0.0.1',
    dbOptions: {},
    mainroom: 'MainRoom'
};

// External dependencies
var express = require('express'),
    http = require('http'),
    events = require('events'),
    _ = require('underscore'),
    sanitize = require('validator').sanitize;

// HTTP Server configuration & launch
var app = express(),
    server = http.createServer(app);
    server.listen(conf.port);

// Express app configuration
app.configure(function() {
    app.use(express.bodyParser());
    app.use(express.static(__dirname + '/static'));
});

var io = require('socket.io')(server);
var redis = require('socket.io-redis');
io.adapter(redis({ host: conf.dbHost, port: conf.dbPort }));

var db = require('redis').createClient(conf.dbPort,conf.dbHost);

// Logger configuration
var logger = new events.EventEmitter();
logger.on('newEvent', function(event, data) {
    // Console log
    console.log('%s: %s', event, JSON.stringify(data));
    // Persistent log storage too?
    // TODO
});
var musicindex = 0;
// ***************************************************************************
// Express routes helpers
// ***************************************************************************

// Only authenticated users should be able to use protected methods
var requireAuthentication = function(req, res, next) {
    // TODO
    next();
};

// Send a message to all active rooms
var sendBroadcast = function(text) {
    _.each(io.nsps['/'].adapter.rooms, function(sockets, room) {
        var message = {'room':room, 'username':'ServerBot', 'msg':text, 'date':new Date()};
        io.to(room).emit('newMessage', message);
    });
    logger.emit('newEvent', 'newBroadcastMessage', {'msg':text});
};

// ***************************************************************************
// Express routes
// ***************************************************************************

// Welcome message
app.get('/', function(req, res) {
    res.send(200, "Welcome to chat server");
});

// Broadcast message to all connected users
app.post('/api/broadcast/', requireAuthentication, function(req, res) {
    sendBroadcast(req.body.msg);
    res.send(201, "Message sent to all rooms");
});

// ***************************************************************************
// Socket.io events
// ***************************************************************************

io.sockets.on('connection', function(socket) {

    // Welcome message on connection
    socket.emit('connected', 'Welcome to the chat server');
    logger.emit('newEvent', 'userConnected', {'socket':socket.id});

    // Store user data in db
    db.hset([socket.id, 'connectionDate', new Date()], redis.print);
    db.hset([socket.id, 'socketID', socket.id], redis.print);
    db.hset([socket.id, 'username', 'anonymous'], redis.print);

    // Join user to 'MainRoom'
    socket.join(conf.mainroom);
    logger.emit('newEvent', 'userJoinsRoom', {'socket':socket.id, 'room':conf.mainroom});
    // Confirm subscription to user
    socket.emit('subscriptionConfirmed', {'room':conf.mainroom});
    // Notify subscription to all users in room
    var data = {'room':conf.mainroom, 'username':'anonymous', 'msg':'----- Joined the room -----', 'id':socket.id};
    io.to(conf.mainroom).emit('userJoinsRoom', data);

    // User wants to subscribe to [data.rooms]
    socket.on('subscribe', function(data) {
        // Get user info from db
        db.hget([socket.id, 'username'], function(err, username) {

            // Subscribe user to chosen rooms
            _.each(data.rooms, function(room) {
                room = room.replace(" ","");
                socket.join(room);
                logger.emit('newEvent', 'userJoinsRoom', {'socket':socket.id, 'username':username, 'room':room});

                // Confirm subscription to user
                socket.emit('subscriptionConfirmed', {'room': room});

                // Notify subscription to all users in room
                var message = {'room':room, 'username':username, 'msg':'----- Joined the room -----', 'id':socket.id};
                io.to(room).emit('userJoinsRoom', message);
            });
        });
    });

    // User wants to unsubscribe from [data.rooms]
    socket.on('unsubscribe', function(data) {
        // Get user info from db
        db.hget([socket.id, 'username'], function(err, username) {

            // Unsubscribe user from chosen rooms
            _.each(data.rooms, function(room) {
                if (room != conf.mainroom) {
                    socket.leave(room);
                    logger.emit('newEvent', 'userLeavesRoom', {'socket':socket.id, 'username':username, 'room':room});

                    // Confirm unsubscription to user
                    socket.emit('unsubscriptionConfirmed', {'room': room});

                    // Notify unsubscription to all users in room
                    var message = {'room':room, 'username':username, 'msg':'----- Left the room -----', 'id': socket.id};
                    io.to(room).emit('userLeavesRoom', message);
                }
            });
        });
    });

    // User wants to know what rooms he has joined
    socket.on('getRooms', function(data) {
        socket.emit('roomsReceived', socket.rooms);
        logger.emit('newEvent', 'userGetsRooms', {'socket':socket.id});
    });

    // Get users in given room
    socket.on('getUsersInRoom', function(data) {
        var usersInRoom = [];
        var socketsInRoom = _.keys(io.nsps['/'].adapter.rooms[data.room]);
        for (var i=0; i<socketsInRoom.length; i++) {
            db.hgetall(socketsInRoom[i], function(err, obj) {
                usersInRoom.push({'room':data.room, 'username':obj.username, 'id':obj.socketID});
                // When we've finished with the last one, notify user
                if (usersInRoom.length == socketsInRoom.length) {
                    socket.emit('usersInRoom', {'users':usersInRoom});
                }
            });
        }
    });

    socket.on('getMusics',function(data){
        var usersInRoom = [];
        var socketsInRoom = _.keys(io.nsps['/'].adapter.rooms[data.room]);
        for (var i=0; i<socketsInRoom.length; i++) {
            db.hgetall(socketsInRoom[i], function(err, obj) {
                usersInRoom.push({'room':data.room, 'username':obj.username, 'id':obj.socketID});
                // When we've finished with the last one, notify user
                console.log('找到音乐socket');
                if (usersInRoom.length == socketsInRoom.length)
                 {
                    // socket.emit('musicInRoom', {'musics':[{
                    //     title: '李白',
                    //     author: '李荣浩',
                    //     url: 'http://dl.stream.qqmusic.qq.com/C100000rBgbe4K0vuz.m4a?guid=563327206&vkey=C9C0F01F38BEE706ACB74A3AA60E1EF678C05B7A055C5A42191D3205AAFDDB2DC324EDB709768256468E5ED1EED0E2FF14FD48A0EAEBDCA2&uin=0&fromtag=999',
                    // }],'starttime':10});

                    db.zrange( [data.room+'music',0,-1],function (err,obj) {
                         console.log(obj);
                         var musics = [];
                         for(var i = 0; i<obj.length; ++i)
                         {
                             musics.push(JSON.parse(obj[i]));
                         }
                        if( musics.length > 0 )
                            socket.emit('musicInRoom', {'musics':musics,'starttime':10});
                    } )
                }
            });
        }
    });

    // User wants to change his nickname
    socket.on('setNickname', function(data) {
        // Get user info from db
        db.hget([socket.id, 'username'], function(err, username) {

            // Store user data in db
            db.hset([socket.id, 'username', data.username], redis.print);
            logger.emit('newEvent', 'userSetsNickname', {'socket':socket.id, 'oldUsername':username, 'newUsername':data.username});

            // Notify all users who belong to the same rooms that this one
            _.each(socket.rooms, function(room) {
                if (room) {
                    var info = {'room':room, 'oldUsername':username, 'newUsername':data.username, 'id':socket.id};
                    io.to(room).emit('userNicknameUpdated', info);
                }
            });
        });
    });

    // New message sent to group
    socket.on('newMessage', function(data) {
        db.hgetall(socket.id, function(err, obj) {
            if (err) return logger.emit('newEvent', 'error', err);
            // Check if user is subscribed to room before sending his message
            if (_.contains(_.values(socket.rooms), data.room)) {
              var message = {'room':data.room, 'username':obj.username, 'msg':data.msg, 'date':new Date(),'music':data.music};

              if( data.music )
              {
                // 存储
                message.music = data.music;
                db.zadd([data.room+'music',musicindex++,JSON.stringify(data.music)], redis.print);
              }
                // Send message to room
                io.to(data.room).emit('newMessage', message);
                logger.emit('newEvent', 'newMessage', message);
            }
        });
    });

    // Clean up on disconnect
    socket.on('disconnect', function() {

        // Get current rooms of user
        var rooms = socket.rooms;

        // Get user info from db
        db.hgetall(socket.id, function(err, obj) {
            if (err) return logger.emit('newEvent', 'error', err);
            logger.emit('newEvent', 'userDisconnected', {'socket':socket.id, 'username':obj.username});

            // Notify all users who belong to the same rooms that this one
            _.each(rooms, function(room) {
                if (room) {
                    var message = {'room':room, 'username':obj.username, 'msg':'----- Left the room -----', 'id':obj.socketID};
                    io.to(room).emit('userLeavesRoom', message);
                }
            });
        });

        // Delete user from db
        db.del(socket.id, redis.print);
    });
});

// Automatic message generation (for testing purposes)
if (conf.debug) {
    setInterval(function() {
        var text = 'Testing rooms';
        sendBroadcast(text);
    }, 60000);
}
