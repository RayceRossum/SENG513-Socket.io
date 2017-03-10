$(function() {
    var socket = io();
    let nickname = "";
    if (getCookie('nickname')) {
      nickname = getCookie('nickname');
      socket.emit('userjoin', nickname);
    } else {
      socket.emit('getnick');
    }

    $('form').submit(function() {
        var msg = $('#m').val();
        if (msg.startsWith("/")) {
            switch (msg.substring(1, msg.indexOf(' '))) {
                case "nick":
                    newNickname = msg.substring(msg.indexOf(' ') + 1);
                    socket.emit('nickchange', nickname, newNickname);
                    setCookie('nickname', newNickname);
                    break;
                case "color":
                case "colour":
                    newColour = msg.substring(msg.indexOf(' ') + 1);
                    socket.emit('colorchange', newColour);
                    break;
                case "whisper":
                    socket.emit('whisper', nickname, msg);
                    break;
            }
        } else {
            socket.emit('chat', $('#m').val(), nickname);
        }
        $('#m').val('');
        return false;
    });

    socket.on('chat', function(msg, fromNick, colour, animate) {
        $('#messages').append($('<li>').text(msg).css({
            'color': colour,
        }).addClass('list-group-item'));

        if (nickname === fromNick) {
            $('#messages li:last-child').css({
                'font-weight': 'bold'
            });
        }

        if (animate) {
            $('html body').animate({
                    scrollTop: $(document).height() - $(window).height()
                },
                50,
                "swing"
            );
        }
    });

    socket.on('serverchat', function(msg) {
        $('#messages').append($('<li>').text(msg).css({
            'font-style': 'italic'
        }).addClass('list-group-item'));

        $('#messages').addClass('list-group-item');

        $('html body').animate({
                scrollTop: $(document).height() - $(window).height()
            },
            50,
            "swing"
        );
    });

    socket.on('nickchange', function(changeAllowed, servermsg) {
        if (changeAllowed) {
            nickname = newNickname;
        }

        $('#messages').append($('<li>').text(servermsg).css({
            'font-style': 'italic'
        }).addClass('list-group-item'));


        $('html body').animate({
                scrollTop: $(document).height() - $(window).height()
            },
            50,
            "swing"
        );
    });

    socket.on('userupdate', function(nicknames) {
        $('#users').empty();
        for (var nickname in nicknames) {
            $('#users').append($('<li>').text(nicknames[nickname]).addClass('list-group-item'));
        }
    });

    $('#users').on('click', "li", function() {
        $("#m").val("/whisper \"" + $(this).text() + "\" ");
    });

    socket.on('randomnick', function (randomnick) {
          nickname = randomnick;
          setCookie('nickname', randomnick);
          socket.emit('userjoin', nickname);
    });
});

// Source: http://stackoverflow.com/questions/1458724/how-do-i-set-unset-cookie-with-jquery
function setCookie(key, value) {
    var expires = new Date();
    expires.setTime(expires.getTime() + (1 * 24 * 60 * 60 * 1000));
    document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();
}

function getCookie(key) {
    var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
    return keyValue ? keyValue[2] : null;
}
