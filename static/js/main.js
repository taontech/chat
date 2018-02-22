
// Author: Sergio Castaño Arteaga
// Email: sergio.castano.arteaga@gmail.com
var nickname = '匿名';
var starttime = 0;
( function(){

    var debug = false;

    // ***************************************************************************
    // Socket.io events
    // ***************************************************************************

    var socket = io.connect(window.location.host);


    var ap1;
    // = new APlayer({
    //     element: document.getElementById('player1'),
    //     narrow: false,
    //     autoplay: true,
    //     showlrc: false,
    //     mutex: true,
    //     theme: '#e60000',
    //     preload: 'metadata',
    //     mode: 'circulation',
    //     music: {
    //         title: '李白blblblbl',
    //         author: '李荣浩',
    //         url: 'http://dl.stream.qqmusic.qq.com/C100000rBgbe4K0vuz.m4a?guid=563327206&vkey=C9C0F01F38BEE706ACB74A3AA60E1EF678C05B7A055C5A42191D3205AAFDDB2DC324EDB709768256468E5ED1EED0E2FF14FD48A0EAEBDCA2&uin=0&fromtag=999',
    //     }
    // });
    // ap1.pause();

    // ap1.on("ended",function () {
    //     conslog.log("xxxx");
    // });

  //            $.ajax({
  //                url: "https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg?is_xml=0&format=jsonp&key=%E6%9D%8E%E7%99%BD&g_tk=5381&loginUin=0&hostUin=0&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0&jsonpCallback=callback",
  //                dataType:'JSONP',
  //                type:'GET',
  //                // jsonpCallback: "dosomething",
  //                success: function (data) {
  //                    console.log(data);
  //                }
  //            })




    // Connection established
    socket.on('connected', function (data) {
        console.log(data);

        // Get users connected to mainroom
        socket.emit('getUsersInRoom', {'room':'MainRoom'});
        socket.emit('getMusics',{'room':'MainRoom'});
        if (debug) {
            // Subscription to rooms
            socket.emit('subscribe', {'username':'sergio', 'rooms':['sampleroom']});

            // Send sample message to room
            socket.emit('newMessage', {'room':'sampleroom', 'msg':'Hellooooooo!'});

            // Auto-disconnect after 10 minutes
            setInterval(function() {
                socket.emit('unsubscribe', {'rooms':['sampleroom']});
                socket.disconnect();
            }, 600000);
        }
        // 设置昵称
        $('#modal_setnick').modal('show');
    });

    // Disconnected from server
    socket.on('disconnect', function (data) {
        var info = {'room':'MainRoom', 'username':'ServerBot', 'msg':'----- Lost connection to server -----'};
        addMessage(info);
    });

    // Reconnected to server
    socket.on('reconnect', function (data) {
        var info = {'room':'MainRoom', 'username':'ServerBot', 'msg':'----- Reconnected to server -----'};
        addMessage(info);
    });

    // Subscription to room confirmed
    socket.on('subscriptionConfirmed', function(data) {
        // Create room space in interface
        if (!roomExists(data.room)) {
            addRoomTab(data.room);
            addRoom(data.room);
        }

        // Close modal if opened
        $('#modal_joinroom').modal('hide');
    });

    // Unsubscription to room confirmed
    socket.on('unsubscriptionConfirmed', function(data) {
        // Remove room space in interface
        if (roomExists(data.room)) {
            removeRoomTab(data.room);
            removeRoom(data.room);
        }
    });

    // User joins room
    socket.on('userJoinsRoom', function(data) {
        console.log("userJoinsRoom: %s", JSON.stringify(data));
        // Log join in conversation
        addMessage(data);

        // Add user to connected users list
        addUser(data);
    });

    // User leaves room
    socket.on('userLeavesRoom', function(data) {
        console.log("userLeavesRoom: %s", JSON.stringify(data));
        // Log leave in conversation
        addMessage(data);

        // Remove user from connected users list
        removeUser(data);
    });

    // Message received
    socket.on('newMessage', function (data) {
        console.log("newMessage: %s", JSON.stringify(data));
        addMessage(data);

        // Scroll down room messages
        var room_messages = '#room_messages_'+data.room;
        $(room_messages).animate({
            scrollTop: $(room_messages).prop('scrollHeight')
        }, 300);
        // 如果是音乐类的命令，则搜索播放歌曲
        // if( data.msg[0] == '/' )
        // {
        //     console.log("收到音乐类指令");
        //     searchAndPlay(data.msg.substr(1,data.msg.length-1));
        // }
        if( data.music )
        {
            // 如果有音乐信息，则添加
            if(ap1 == undefined){
              ap1 = new APlayer({
               element: document.getElementById('player1'),
               narrow: false,
               autoplay: true,
               showlrc: false,
               mutex: true,
               theme: '#e60000',
               preload: 'metadata',
               mode: 'order',
               music:data.music,
             });
             ap1.on('ended',function(){
                // ap1.removeSong(0);
                //  // ap1.destroy();
                //  ap1.play(0);
                 socket.emit('playended', {'room':data.room, 'music':(ap1.music)});
                // ap1.pause();
             })
           }else
                ap1.addMusic([data.music]);
        }
    });

    // Users in room received
    socket.on('usersInRoom', function(data) {
        console.log('usersInRoom: %s', JSON.stringify(data));
        _.each(data.users, function(user) {
            addUser(user);
        });
    });
    socket.on('musicInRoom',function(data){
       console.log('musicInRoom:%s',JSON.stringify(data));
      //  if(ap1)
        //   ap1.destroy();
        ap1 = new APlayer({
         element: document.getElementById('player1'),
         narrow: false,
         autoplay: true,
         showlrc: false,
         mutex: true,
         theme: '#e60000',
         preload: 'metadata',
         mode: 'order',
         music:data.musics,
       });
       starttime = data.starttime;
      // ap1.play(((new Date().getTime()) - data.starttime)/1000);

       ap1.on('ended',function(){
          // ap1.removeSong(0);
          //  // ap1.destroy();
          //  ap1.play(0);
           socket.emit('playended', {'room':data.room, 'music':(ap1.music)});
          //  ap1.pause();
       })
    });
    var changeMusic = function(){
      if(ap1.option.music.length > 1){
        ap1.removeSong(0);
        ap1.play(0);
      }else {
        ap1.destroy();
        ap1 = undefined;
      }

    }
    socket.on('changemusic',function () {
        changeMusic();
        $('#b_qie_message').text('切歌');

    })
    socket.on('changemusiccount',function(data){
      $('#b_qie_message').text('切歌('+data.vote+'/'+data.all+')');
    })
    // User nickname updated
    socket.on('userNicknameUpdated', function(data) {
        console.log("userNicknameUpdated: %s", JSON.stringify(data));
        updateNickname(data);

        msg = '----- ' + data.oldUsername + ' is now ' + data.newUsername + ' -----';
        var info = {'room':data.room, 'username':'ServerBot', 'msg':msg};
        addMessage(info);
    });

    // ***************************************************************************
    // Templates and helpers
    // ***************************************************************************

    var templates = {};
    var getTemplate = function(path, callback) {
        var source;
        var template;

        // Check first if we've the template cached
        if (_.has(templates, path)) {
            if (callback) callback(templates[path]);
        // If not we get and compile it
        } else {
            $.ajax({
                url: path,
                success: function(data) {
                    source = data;
                    template = Handlebars.compile(source);
                    // Store compiled template in cache
                    templates[path] = template;
                    if (callback) callback(template);
                }
            });
        }
    }

    // Add room tab
    var addRoomTab = function(room) {
        getTemplate('js/templates/room_tab.handlebars', function(template) {
            $('#rooms_tabs').append(template({'room':room}));

        });
    };

    // Remove room tab
    var removeRoomTab = function(room) {
        var tab_id = "#"+room+"_tab";
        $(tab_id).remove();
    };

    // Add room
    var addRoom = function(room) {
        getTemplate('js/templates/room.handlebars', function(template) {
            $('#rooms').append(template({'room':room}));

            // Toogle to created room
            var newroomtab = '[href="#'+room+'"]';
            $(newroomtab).click();

            // Get users connected to room
            socket.emit('getUsersInRoom', {'room':room});
        });
    };

    // Remove room
    var removeRoom = function(room) {
        var room_id = "#"+room;
        $(room_id).remove();
    };

    // Add message to room
    var addMessage = function(msg) {

        var templPath = 'js/templates/message.handlebars';
        if( msg.username == nickname ){
            templPath = 'js/templates/mymessage.handlebars'
        }
        if( msg.music )
        {
            templPath = 'js/templates/musicmessage.handlebars'
        }
        getTemplate(templPath, function(template) {
            var room_messages = '#room_messages_'+msg.room;
            if ($(room_messages).length > 0) {
                $(room_messages).append(template(msg));
            } else {
                var roomInterval = setInterval(function() {
                    if ($(room_messages).length > 0) {
                        $(room_messages).append(template(msg));
                        clearInterval(roomInterval);
                    }
                }, 100);
            }
        });
    };
    callbackmusic = function (data) {
        console.log(data);
        var firstM = data.data.song.itemlist[0];

        //"https://y.gtimg.cn/music/photo_new/T002R500x500M000"+state.song.albummid+".jpg"
        var music = {
            title: getNickname()+" 敬献："+firstM.name,
            author: firstM.singer,
            url: 'http://dl.stream.qqmusic.qq.com/C100'+firstM.mid + '.m4a?guid=563327206&vkey=C9C0F01F38BEE706ACB74A3AA60E1EF678C05B7A055C5A42191D3205AAFDDB2DC324EDB709768256468E5ED1EED0E2FF14FD48A0EAEBDCA2&uin=0&fromtag=999',
            pic: "https://y.gtimg.cn/music/photo_new/T002R500x500M000"+firstM.albummid+".jpg"
        }
      //  ap1.addMusic([music]);
        socket.emit('newMessage', {'room':getCurrentRoom(), 'msg':"为大家献上："+ music.title ,'music':music});
    };
    var searchAndPlay = function(name){

        $.ajax({
            url: "https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg?is_xml=0&format=jsonp&key="+encodeURI(name)+"&g_tk=5381&loginUin=0&hostUin=0&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0&jsonpCallback=callbackmusic",
            dataType:'JSONP',
            type:'GET',
            // jsonpCallback: "dosomething",
            success: function (data) {
                console.log(data);
            }
        })
    }
    // Add user to connected users list
    var addUser = function(user) {
        getTemplate('js/templates/user.handlebars', function(template) {
            var room_users = '#room_users_'+user.room;
            // Add only if it doesn't exist in the room
            var user_badge = '#'+user.room+' #'+user.id;
            if (!($(user_badge).length)) {
                $(room_users).append(template(user));
            }
        });
    }

    // Remove user from connected users list
    var removeUser = function(user) {
        var user_badge = '#'+user.room+' #'+user.id;
        $(user_badge).remove();
    };

    // Check if room exists
    var roomExists = function(room) {
        var room_selector = '#'+room;
        if ($(room_selector).length) {
            return true;
        } else {
            return false;
        }
    };

    // Get current room
    var getCurrentRoom = function() {
        return $('li[id$="_tab"][class="active"]').text();
    };

    // Get message text from input field
    var getMessageText = function() {
        var text = $('#message_text').val();
        $('#message_text').val("");
        return text;
    };

    // Get room name from input field
    var getRoomName = function() {
        var name = $('#room_name').val().trim();
        $('#room_name').val("");
        return name;
    };

    // Get nickname from input field
    var getNickname = function() {
        var nickname = $('#nickname').val();
       // $('#nickname').val("");
        return nickname;
    };

    // Update nickname in badges
    var updateNickname = function(data) {
        var badges = '#'+data.room+' #'+data.id;
        $(badges).text(data.newUsername);
    };

    // ***************************************************************************
    // Events
    // ***************************************************************************

    // Send new message
    $('#b_send_message').click(function(eventObject) {
        eventObject.preventDefault();
        if ($('#message_text').val() != "") {
            var msg = getMessageText();

            socket.emit('newMessage', {'room':getCurrentRoom(), 'msg':msg});

            if( msg[0] == '/' )
            {
                console.log("收到音乐类指令");
                searchAndPlay(msg.substr(1,msg.length-1));
            }
        }
    });

    $('#b_qie_message').click(function(eventObject) {
        eventObject.preventDefault();
        // 切歌
        socket.emit('changeMusic', {'room':getCurrentRoom(), 'music':(ap1.music)});
    });
    // Join new room
    $('#b_join_room').click(function(eventObject) {
        var roomName = getRoomName();

        if (roomName) {
            eventObject.preventDefault();
            socket.emit('subscribe', {'rooms':[roomName]});

        // Added error class if empty room name
        } else {
            $('#room_name').addClass('error');
        }
    });

    // Leave current room
    $('#b_leave_room').click(function(eventObject) {
        eventObject.preventDefault();
        var currentRoom = getCurrentRoom();
        if (currentRoom != 'MainRoom') {
            socket.emit('unsubscribe', {'rooms':[getCurrentRoom()]});

            // Toogle to MainRoom
            $('[href="#MainRoom"]').click();
        } else {
            console.log('Cannot leave MainRoom, sorry');
        }
    });

    // Remove error style to hide modal
    $('#modal_joinroom').on('hidden.bs.modal', function (e) {
        if ($('#room_name').hasClass('error')) {
            $('#room_name').removeClass('error');
        }
    });

    // Set nickname
    $('#b_set_nickname').click(function(eventObject) {
        eventObject.preventDefault();
        socket.emit('setNickname', {'username':getNickname()});
        nickname = getNickname();
        // Close modal if opened
        $('#modal_setnick').modal('hide');
        var time = ((new Date().getTime()) - starttime)/1000;
        // ap1.play();
        ap1.play(time);
    });
    // $('#nickname').click(function(eventObject) {
    //     eventObject.preventDefault();
    //     setnickname();
    // });
    setnickname = function(){
      socket.emit('setNickname', {'username':getNickname()});
      nickname = getNickname();
      // Close modal if opened
      $('#modal_setnick').modal('hide');
      var time = ((new Date().getTime()) - starttime)/1000;
      // ap1.play();
      ap1.play(time);
    }
})();
