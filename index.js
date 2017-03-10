var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 5000;

http.listen(port, function() {
    console.log('Listening on port', port);
});

app.use(express.static(__dirname + '/public'));

var userList = [];
var chatHistory = [];

io.on('connection', function(socket) {
    for (var chat in chatHistory) {
        io.to(socket.id).emit('chat', chatHistory[chat].msg, chatHistory[chat].nickname, chatHistory[chat].colour, false);
    }
    //io.to(socket.id).emit('chat', '', '', ''',' true); // Emit bottom scroll when complete load of chatHistory, otherwise awkward things happen

    socket.on('getnick', function() {
      var randomnick = socket.id;
      io.emit('randomnick', randomnick);
    });

    socket.on('chat', function(msg, nickname) {
        var date = new Date();

        finalMsg = getTimeStamp(date) + " " + nickname + " => " + msg;
        msgColour = userList[getIndexbySocket(socket)].colour;

        if (chatHistory.length >= 200) {
            chatHistory.shift();
        }
        chatHistory.push({
            nickname: nickname,
            msg: finalMsg,
            colour: msgColour
        });
        io.emit('chat', finalMsg, nickname, msgColour, true);
    });

    socket.on('userjoin', function(nickname) {
        userList.push({
            nickname: nickname,
            socket: socket,
            colour: "",
        });

        console.log(nickname + " has joined the room.");
        io.emit('serverchat', nickname + " has joined the room.");
        io.emit('userupdate', getUserListNicks());
    });

    socket.on('whisper', function(nickname, msg) {
        var recNick = msg.match(/"(.*?)"/)[1];

        whisperMsgIndex = msg.indexOf(recNick) + recNick.length + 2;
        whisperMsg = msg.substring(whisperMsgIndex);

        var index = getIndexbyNick(recNick);
        var date = new Date();

        finalMsg = getTimeStamp(date) + " ~" + nickname + "~ => " + whisperMsg;
        msgColour = userList[getIndexbySocket(socket)].colour;

        try {
            io.to(userList[index].socket.id).emit('chat', finalMsg, nickname, msgColour, true);
            io.to(socket.id).emit('chat', finalMsg, nickname, msgColour, true);
        } catch (e) {
            io.to(socket.id).emit('serverchat', "Unable to send message to specified user. Are you sure they're online?");
        }
    });

    socket.on('nickchange', function(nickname, newNickname) {
        if (getUserListNicks().includes(newNickname)) {
            console.log(nickname + " nick change denied")
            io.to(socket.id).emit('nickchange', false, "The nickname " + newNickname + " is in use by another user.");
        } else {
            var i = getIndexbySocket(socket);
            console.log(nickname + " changed to " + newNickname);
            io.to(socket.id).emit('nickchange', true, "Your new nickname is " + newNickname + ".");
            socket.broadcast.emit('serverchat', nickname + "'s new nickname is " + newNickname + ".", '', '', true);
            userList[i].nickname = newNickname;

            io.emit('userupdate', getUserListNicks());
        }
    });

    socket.on('colorchange', function(newColour) {
        if (/^#[0-9A-F]{6}$/i.test(newColour)) {
            userList[getIndexbySocket(socket)].colour = newColour;
            io.to(socket.id).emit('serverchat', "Colour updated to " + newColour + ".");
        } else {
            io.to(socket.id).emit('serverchat', "Invalid colour " + newColour + ".");
        }
    });

    socket.on('disconnect', function() {
        var i = userList.map(function(d) {
            return d['socket'];
        }).indexOf(socket);
        var nicknames = getUserListNicks();

        userList.splice(i, 1);

        console.log(nicknames[i] + " has disconnected. Socket: " + i);
        io.emit('serverchat', nicknames[i] + " has disconnected.");
        io.emit('userupdate', getUserListNicks());
    });
});

function getUserListNicks() {
    return userList.map(function(d) {
        return d['nickname'];
    });
}

function getIndexbySocket(socket) {
    return userList.map(function(d) {
        return d['socket'];
    }).indexOf(socket);
}

function getIndexbyNick(nickname) {
    return userList.map(function(d) {
        return d['nickname'];
    }).indexOf(nickname);
}

function getTimeStamp(date) {
    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    var min = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;
    var sec = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    return "(" + hour + ":" + min + ":" + sec + ")";
}
