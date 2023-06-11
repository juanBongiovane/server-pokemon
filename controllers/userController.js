const User = require('../models/Users');
const Pokedex = require('../models/Pokedex');
const {ObjectId} = require("mongodb");
const bcrypt = require("bcrypt");


exports.createUser = async (req, res) => {
    try {
        const newUser = new User(req.body);
        const savedUser = await newUser.save();
        res.json(savedUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUser = async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUserByName = async (req, res) => {
    try {
        const { name } = req.params;
        const user = await User.findOne({ name });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId, {password:0})
            .populate('friends.friend', {_id:1, name:1, trainerAvatar:1 })
            .populate('boxes.pokemons.species');
        console.log(user);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Error getting user by ID' });
    }
};

exports.buyPokemon = async (req, res) => {
    try {
        const buy = req.body.buy;
        const userId = req.userId;
        const pokemon = await Pokedex.findById(buy.id);
        const user = await User.findById(userId);
        const spaceInBoxes = 90 - user.boxes.reduce((count, box) => box.pokemons.length + count, 0);

        const cost = buy.count;

        if (user.coin >= (buy.count * pokemon.price) && spaceInBoxes > 0) {
            for (let boxIndex = 0; boxIndex < user.boxes.length; boxIndex++) {
                const box = user.boxes[boxIndex];
                const availableSpace = 30 - box.pokemons.length;
                if (availableSpace > 0) {
                    const pokemonsToAdd = Math.min(availableSpace, buy.count);
                    for (let i = 0; i < pokemonsToAdd; i++) {
                        box.pokemons.push({ name: pokemon.name, level: 1, species: buy.id });
                    }
                    buy.count -= pokemonsToAdd;
                    if (buy.count === 0) {
                        break;
                    }
                }
            }
            await User.findByIdAndUpdate({ _id: userId }, { coin: (user.coin - (cost*pokemon.price)), boxes: user.boxes });
        }
        res.status(200).json({});
    } catch (err) {
        res.status(500).json({ error: "Error al comprar pokemon" });
    }
}

exports.sellPokemon = async (req, res) => {
    try {
        const pokemonId = req.body.id;
        const userId = req.userId;
        const user = await User.aggregate([
            {'$match': {'_id': new ObjectId(userId)}
            }, {'$unwind': {'path': '$boxes'}
            }, {'$unwind': { 'path': '$boxes.pokemons'}
            }, {'$match': {'boxes.pokemons._id': new ObjectId(pokemonId)}
            }, {'$replaceRoot': {'newRoot': '$boxes.pokemons'}
            }, {'$lookup': {'from': 'pokedex', 'localField': 'species', 'foreignField': '_id', 'as': 'species'}
            }
        ]);
        const price = user[0].species[0].price;
        await User.findOneAndUpdate(
            { "_id": new ObjectId(userId), "boxes.pokemons._id": new ObjectId(pokemonId) },
            {
                "$pull": { "boxes.$[].pokemons": { "_id": new ObjectId(pokemonId) } },
                "$inc": { "coin": (Math.round(price-price*0.3)) }
            }
        );
        res.status(200).json({});
    } catch (err) {
        res.status(500).json({ error: "Error al vender el pokemon" });
    }
};

exports.savePokemon = async (req, res) => {
    try {
        const pokemonID = req.body;
        const userId = req.userId;
        const user = await User.findOne({ _id: new ObjectId(userId) });

        if (user) {
            const boxIndex = user.boxes.findIndex(box => box.pokemons.some(pokemon => pokemon._id.toString() === pokemonID.id));

            if (boxIndex !== -1) {
                const box = user.boxes[boxIndex];
                const pokemonIndex = box.pokemons.findIndex(pokemon => pokemon._id.toString() === pokemonID.id);

                if (pokemonIndex !== -1) {
                    box.pokemons[pokemonIndex].name = pokemonID.name
                    user.boxes[pokemonID.box].pokemons.splice(user.boxes[pokemonID.box].pokemons.length, 0, box.pokemons[pokemonIndex]);
                    box.pokemons.splice(pokemonIndex, 1);
                    await user.save();
                }
            }
        }
        res.status(200).json({});
    } catch (err) {
        res.status(500).json({ error: 'Error al editar el Pokémon.' });
    }
};

exports.editPerfil = async (req, res) => {
    try {
        const user = req.body;

        if(user.password !== ''){
            const userDB = await User.findById(req.userId);
            const isMatch = await userDB.comparePassword(user.password);
            if (!isMatch) {
                return res.status(400).send({ error: 'Invalid password' });
            }
            const newPassword = await bcrypt.hash(user.newPassword, 10);

            await User.findByIdAndUpdate(req.userId, {
                name: user.name,
                email: user.email,
                birthDate: user.birthDate,
                password: newPassword,
                trainerAvatar: user.trainerAvatar
            });
            res.status(200).json('contraseña cambiada OK');
        }else {
            await User.findByIdAndUpdate(req.userId, {
                name: user.name,
                email: user.email,
                birthDate: user.birthDate,
                trainerAvatar: user.trainerAvatar
            });
            res.status(200).json('save OK');
        }

    }catch (err){
        res.status(500).json({error: 'Error a guardar los cambios'})
    }
}
