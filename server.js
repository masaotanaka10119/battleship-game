// 【1〜3行目】 必要な「道具」を箱から取り出す
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

// 各部屋の準備人数を記録する箱
let roomStatus = {};

// ブラウザがアクセスしてきた時の案内
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('誰かが接続しました！');

    // 部屋に入る処理
    socket.on('join-room', (roomName) => {
        socket.join(roomName);
        socket.currentRoom = roomName;
        console.log(`ユーザーが部屋 [${roomName}] に参加しました`);
    });

    // 「準備完了（ready）」が届いた時
    socket.on('ready', (data) => {
        const room = socket.currentRoom;
        if (!roomStatus[room]) roomStatus[room] = 0;
        roomStatus[room]++;

        // 1. 本人には「順番」を教える
        socket.emit('order-decision', roomStatus[room]);
        
        // 2. 同じ部屋の人全員に船の数を教える
        io.to(room).emit('enemy-ship-count', { 
            id: socket.id, 
            shipCount: data.shipCount 
        });

        // ★重要：2人揃ったら「対戦スタート」の合図を部屋全員に送る
        if (roomStatus[room] === 2) {
            io.to(room).emit('game-start');
            console.log(`部屋[${room}]: 2人揃ったのでゲーム開始！`);
        }
        
        console.log(`部屋[${room}]: 準備完了 ${roomStatus[room]}人目`);
    });
    
    // 攻撃の転送
    socket.on('attack', (index) => {
        socket.to(socket.currentRoom).emit('attack', index);
    });

    // 判定結果の転送
    socket.on('result', (data) => {
        socket.to(socket.currentRoom).emit('result', data);
    });

    socket.on('disconnect', () => {
        const room = socket.currentRoom;
        if (room && roomStatus[room]) {
            roomStatus[room] = 0; 
        }
        console.log('接続が切れました。');
    });
});

// Renderの環境に対応
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`サーバー起動！ポート: ${PORT}`);
});