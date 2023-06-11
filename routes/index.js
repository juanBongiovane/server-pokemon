const express = require('express');
const router = express.Router();
const pokemonController = require('../controllers/pokemonController');
const userController = require('../controllers/userController')
const { authenticateToken } = require('./middleware');
const User = require('../models/Users');


router.get('/main', (req, res) => {
    console.log('hola')
    const data = {
        name: 'juan'
    };
    res.json(data);
});


router.post('/pokemon', authenticateToken, pokemonController.createPokemon);
router.get('/pokemons', authenticateToken, pokemonController.getPokemon);

router.post('/newUser', authenticateToken, userController.createUser);
router.get('/users', authenticateToken, userController.getUser);


router.get('/user', authenticateToken, userController.getUserById);

router.post('/search', authenticateToken, pokemonController.getPokemon);

router.post('/buypokemon', authenticateToken, userController.buyPokemon);

router.post('/sellpokemon', authenticateToken, userController.sellPokemon);

router.post('/savepokemon', authenticateToken, userController.savePokemon);

router.post('/editperfil', authenticateToken, userController.editPerfil);

router.processFriendListMessages = (ws, connectedClients, message) => {

  switch (message.state) {
      case "connected": {
          User.findById(ws.userId, { "friends": 1 })
              .populate("friends", { "_id": 1 })
              .then(userData => {
                  const allFriendsIds = userData.friends.map(f => f.friend._id.toString());
                  const connectedFriends = Object.keys(connectedClients)
                      .filter(friendId => {
                          const isOnline = allFriendsIds.includes(friendId);
                          if (isOnline) {
                              connectedClients[friendId].send(JSON.stringify({ state: "connectedFriend", body: ws.userId }));
                          }
                          return isOnline;
                      });
                  connectedClients[ws.userId]?.send(JSON.stringify({ state: "friendList", body: JSON.stringify(connectedFriends) }));
              });
          break
      }
      case "addFriendOK":{
          const userAId = ws.userId;
          const userBId = message.body;

          console.log (userAId, userBId )

          Promise.all([User.findById(userAId), User.findById(userBId)]).then(async ([userA, userB]) => {

              const friendAIndex = userA.friends.findIndex(ele => ele.friend._id.toString() === userBId);
              const friendBIndex = userB.friends.findIndex(ele => ele.friend._id.toString() === userAId);

              console.log(friendAIndex,friendBIndex )

              if (friendAIndex !== -1) {
                  userA.friends[friendAIndex].state = '';
                  userA.coin += 100;
                  await userA.save();
              }

              if (friendBIndex !== -1) {
                  userB.friends[friendBIndex].state = '';
                  userB.coin += 100;
                  await userB.save();
              }

              connectedClients[userBId].send(JSON.stringify({
                  state: "addFriendOK"
              }));
              connectedClients[userAId].send(JSON.stringify({
                  state: "addFriendOK"
              }));
          });
          break;
      }
      case "NOTaddFriend":{
          const userAId = ws.userId;
          const userBId = message.body;

          Promise.all([User.findById(userAId), User.findById(userBId)]).then(async ([userA, userB]) => {
              const friendAIndex = userA.friends.findIndex(ele => ele.friend._id.toString() === userBId);
              const friendBIndex = userB.friends.findIndex(ele => ele.friend._id.toString() === userAId);

              if (friendAIndex !== -1) {
                  userA.friends.splice(friendAIndex, 1);
                  await userA.save();
              }

              if (friendBIndex !== -1) {
                  userB.friends.splice(friendBIndex, 1);
                  await userB.save();
              }

              connectedClients[userBId].send(JSON.stringify({
                  state: "addFriendOK"
              }));
          });
          break;
      }
      case "chatMessage": {
          Object.values(connectedClients).forEach(client => {
              client.send(JSON.stringify({
                  state: "chatMessage",
                  body: message.body
              }));
          });
          break;
      }
  }
}

router.processExchangeListMessages = (ws, exchangeClients, message) => {
    switch (message.state){
        case "connected":{
            if (exchangeClients[ws.userId]){
                exchangeClients[ws.userId].exchangeData = {pokemonExchange: message.pokemonExchange, _id: message._id, name: message.name, trainerAvatar: message.trainerAvatar};
            }

            ws.send(
                JSON.stringify(
                    {
                        state: "exchangeList",
                        body: Object.values(exchangeClients).filter(e => e.userId !== ws.userId).map(e => e.exchangeData)
                    }
                )
            );

            Object.values(exchangeClients).filter(e => e.userId !== ws.userId).forEach(cli => {
                cli.send(JSON.stringify({
                    state: "newExchangeUser",
                    body: exchangeClients[ws.userId].exchangeData
                }))
            })
            break;
        }
        case "exchange" :{

            Object.values(exchangeClients).filter(e => e.exchangeData.pokemonExchange._id === message.body.pokemonExchange._id).map(cli =>{
                cli.send(JSON.stringify({
                    state: "requestExchange",
                    body: {
                        name: ws.exchangeData.name,
                        pokemonExchange: ws.exchangeData.pokemonExchange
                    }
                }))
            })
            break
        }
        case "exchangeClose":{
            Object.values(exchangeClients).filter(e => e.exchangeData.pokemonExchange._id === message.body._id).map(cli =>{
                cli.send(JSON.stringify({
                    state: "exchangeClose",
                }))
            })
            break
        }
        case  "OKExchange":{
            console.log("ok", message.body)
            const pokemonA = ws.exchangeData.pokemonExchange._id;
            const userAId = ws.userId;

            const pokemonB = message.body._id;
            const userBId =  Object.values(exchangeClients).filter(e => e.exchangeData.pokemonExchange._id === pokemonB)[0].userId;

            Promise.all([User.findById(userAId), User.findById(userBId)]).then(async ([userA, userB]) => {
                if (userA && userB) {
                    console.log("Encontrados usuarios");
                    const boxIndexA = userA.boxes.findIndex(box => box.pokemons.some(pokemon => pokemon._id.toString() === pokemonA));
                    const boxIndexB = userB.boxes.findIndex(box => box.pokemons.some(pokemon => pokemon._id.toString() === pokemonB));

                    if (boxIndexA !== -1 && boxIndexB !== -1) {
                        const boxA = userA.boxes[boxIndexA];
                        const boxB = userB.boxes[boxIndexB];

                        const pokemonIndexA = boxA.pokemons.findIndex(pokemon => pokemon._id.toString() === pokemonA);
                        const pokemonIndexB = boxB.pokemons.findIndex(pokemon => pokemon._id.toString() === pokemonB);

                        if (pokemonIndexA !== -1 && pokemonIndexB !== -1) {
                            const pokemonA = boxA.pokemons[pokemonIndexA];
                            const pokemonB = boxB.pokemons[pokemonIndexB];

                            userA.coin += 100;
                            userB.coin += 100;

                            await userA.save();
                            await userB.save();

                            userA.boxes[boxIndexA].pokemons.splice(pokemonIndexA, 1, pokemonB);
                            userB.boxes[boxIndexB].pokemons.splice(pokemonIndexB, 1, pokemonA);

                            Promise.all([userA.save(), userB.save()]).then(() => {
                                console.log("Intercambio guardado");

                                exchangeClients[userBId].send(JSON.stringify({
                                    state: "OKExchange",
                                }))


                                ws.send(JSON.stringify({
                                    state: "OKExchange",
                                }));
                            })
                        }
                    }
                }

            });
            break
        }
        case "addFriend": {

            const userAId = ws.userId;
            const userBId =  Object.values(exchangeClients).filter(e => e.exchangeData.pokemonExchange._id === message.body.pokemonExchange._id)[0].userId;

            Promise.all([User.findById(userAId), User.findById(userBId)]).then(async ([userA, userB]) => {
                await User.findByIdAndUpdate({_id:userAId}, {$push: {friends: { friend: userB, state:"ENVIADO"} } });
                await User.findByIdAndUpdate({_id:userBId}, {$push: {friends: { friend: userA, state:"PENDIENTE"} } });


                exchangeClients[userBId].send(JSON.stringify({
                    state: "requestAddFriend"
                }));
                exchangeClients[userAId].send(JSON.stringify({
                    state: "requestAddFriend"
                }));
            })
            break;
        }
    }
}


module.exports = router;
