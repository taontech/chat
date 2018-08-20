# MusicChat

<strong>输入"/"后面跟歌名，即可在群内播放搜出来的第一首歌！</strong>


### Requires

  - Node.js
  - NPM (Node Package Manager)
  - Redis

### Get the code

    git clone https://github.com/taontech/chat.git

### Run

Fetch dependencies:

    npm install

Launch Redis:
    
    redis-server

Launch chat server:
    
    (don't forget to launch Redis before!)

    node chatServer.js

Now open this URL in your browser:

    http://localhost:8888/

and you're done ;)

### Broadcast API

Send messages to all connected users:

    Content-Type: application/json
    POST /api/broadcast/

    {"msg": "Hello!"}
