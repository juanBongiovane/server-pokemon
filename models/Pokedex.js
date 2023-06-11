const mongoose = require('mongoose');
const { Schema } = mongoose;

const pokedexSchema = new Schema({
    _id: Number,
    name: String,
    color: String,
    img: String,
    imgBox: String,
    imgGif: String,
    stages: Number,
    price: Number,
    types:[String],
});

module.exports = mongoose.model('Pokedex', pokedexSchema, "pokedex");