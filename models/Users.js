const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcrypt');

const pokemonBox = new Schema({
    name: {
        type: String,

    },
    level: {
        type: String,
    },
    species: {
        type: Number,
        ref: 'Pokedex',
    }
});

const boxSchema = new Schema({
    name: {
        type: String,
    },
    pokemons: [pokemonBox]
});

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    birthDate: {
        type: Date,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    trainerAvatar: {
        type: Number,
        default: 0
    },
    coin: {
        type: Number,
        default: 0
    },
    friends: [{
        friend:{
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        state: String
    }],
    lastLogin: {
        type: Date,
        default: Date.now
    },
    boxes: {
        type: [boxSchema],
        default: [{name: "Box 1", pokemons: []}, {name: "Box 2", pokemons: []}, {name: "Box 3", pokemons: []}]
    }
});

userSchema.pre('save', async function (next) {
    try {
        if (!this.isModified('password')) {
            return next();
        }
        this.password = await bcrypt.hash(this.password, 10);
        next();
    } catch (error) {
        return next(error);
    }
});

userSchema.methods.comparePassword = async function (password) {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        throw new Error(error);
    }
};

module.exports = mongoose.model('User', userSchema);
