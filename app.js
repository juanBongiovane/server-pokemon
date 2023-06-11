const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const authRoutes = require('./routes/auth');
const indexRoutes = require('./routes/index');
const connectDB = require('./config/db');
const cookieParser = require("cookie-parser");

const http = require('http');
const {authenticateTokenWebSocket} = require("./routes/middleware");
const jwt = require("jsonwebtoken");
const config = require("./config/config");
const {processFriendListMessages, processExchangeListMessages} = require("./routes");
const User = require("./models/Users");
const {router} = require("server");

const app = express();
const server = http.createServer(app);
const PORT =  4000;

const wss = new WebSocket.Server({ server });

const connectedClients = {};

const exchangeClients = {};

function manageConnectedClients(listClients, id, ws) {
    if (listClients[id] !== undefined) {
        console.log("closeOld")
        if (listClients[id].hasOwnProperty("exchangeData")) {
            ws.exchangeData = listClients[id].exchangeData;
        }
        listClients[id].close();
    }
    listClients[id] = ws;

}

wss.on('connection', function connection(ws, req) {

    const token = req.headers.cookie.substring(6);

    try{
        const decoded = jwt.verify(token, config.jwtSecret);
        ws.userId = decoded._id;

       if(req.url === "/friendlist")
          manageConnectedClients(connectedClients, decoded._id, ws);
       else if (req.url === "/exchangelist")
          manageConnectedClients(exchangeClients, decoded._id, ws);

        console.log("Socket guardado");
    }catch (error){
        ws.send(JSON.stringify({error: error}));
        ws.close();
    }

    ws.on('message', function incoming(message) {
        const parsedMessage = JSON.parse(message);
        console.log(parsedMessage);
        switch (req.url) {
            case "/friendlist": {processFriendListMessages(ws, connectedClients, parsedMessage); break}
            case "/exchangelist":{processExchangeListMessages(ws, exchangeClients, parsedMessage); break}
            case "/trade": {break;}
        }
    });

    ws.on('close', (code, reason) => {
        console.log("Close", req.url);
        if(req.url === "/friendlist") {
            console.log(code);
            if (code !== 1005)
                delete connectedClients[ws.userId];

            User.findById(ws.userId, {"friends": 1})
                .populate("friends", {"_id": 1})
                .then(userData => {
                    const allFriendsIds = userData.friends.map(f => f.friend._id.toString());
                    Object.keys(connectedClients)
                        .filter(friendId => allFriendsIds.includes(friendId))
                        .forEach(friendId => connectedClients[friendId].send(JSON.stringify({
                            state: "disconnectedFriend",
                            body: ws.userId
                        })));
                });
        } else if(req.url === "/exchangelist"){
            console.log(code);
            delete exchangeClients[ws.userId];

            Object.values(exchangeClients).forEach(cli => {
                cli.send(JSON.stringify({
                    state: "exchangeList",
                    body: Object.values(exchangeClients).filter(e => e.userId !== cli.userId).map(e => e.exchangeData)
                }))
            })

        }
    })

    ws.send(JSON.stringify({state: "connectionOK"}));
});

// Acceso a carpeta publica
app.use("/public", express.static(path.resolve('./public')));

app.use(express.json());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Max-Age", "1800");
    res.header( "Access-Control-Allow-Methods", "PUT, POST, GET, DELETE, PATCH");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});

app.use(
    cors({
        origin: "*",
        optionsSuccessStatus: 200,
        credentials: true,
        methods: 'GET, POST, PUT, DELETE',
        allowedHeaders: 'Content-Type, Authorization',
    })
);

app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true }));

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Rutas principales (index)
app.use('/', indexRoutes);


// Conectar a la base de datos
connectDB()
    .then(() => {
        server.listen(PORT, '0.0.0.0',() => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Error connecting to the database:', error);
        process.exit(1);
    });

