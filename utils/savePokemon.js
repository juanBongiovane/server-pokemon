const Pokedex = require("../models/Pokedex");
const {pokeApiFindPokemon, pokeApiEvolution, pokeApiStats} = require("./pokeapi");
const calculatePricePokemon = require("./calculatePricePokemon");
const {IMG_POKEMON_PNG, IMG_POKEMON_PIXEL_PNG, IMG_POKEMON_GIF} = require("../config/constants");

function savePokemon (pokemon, stats, stages) {

    return Pokedex.findById(pokemon.id).then(existingPokemon=>{
        if (existingPokemon) {
            console.log(`El Pokémon ${pokemon.name} ya existe en la base de datos.`);
            throw new Error(`El Pokémon ${pokemon.name} ya existe en la base de datos.`);
        }

        const price = calculatePricePokemon(pokemon, stats, stages);

        let newPokemon = new Pokedex({
                                                                            _id: pokemon.id,
                                                                            name: pokemon.name,
                                                                            color: pokemon.color.name,
                                                                            img: IMG_POKEMON_PNG + pokemon.id + '.png',
                                                                            imgBox: IMG_POKEMON_PIXEL_PNG + pokemon.name + '.png',
                                                                            imgGif: IMG_POKEMON_GIF + pokemon.id + '.gif',
                                                                            stages: stages,
                                                                            price: price,
                                                                            types:stats.types.map((typeObject) => typeObject.type.name)
        });

        return newPokemon.save().then(s=>console.log(`${newPokemon.name} guardado correctamente.`));
    }).catch(e => {
        console.error(`Error al guardar el Pokémon ${pokemon.name}:`, e);
        return null;
    });
}
async function findAndSavePokemon(name) {
    try {
        const pokemon = await pokeApiFindPokemon(name);
        const evolution = await pokeApiEvolution(pokemon.evolution_chain.url);
        const stats = await pokeApiStats(name);
        async function recursiveEvol(chain, stage) {
            await savePokemon(await pokeApiFindPokemon(chain.species.name),await pokeApiStats(chain.species.name), stage);
            if (chain.evolves_to.length){
                for (let p of chain.evolves_to) {
                    await recursiveEvol(p, stage + 1);
                }
            }
        }

        if (!evolution.chain.evolves_to.length) {
            await savePokemon(pokemon, stats, 2);
        } else {
            console.log("tiene evolucion");
            await recursiveEvol(evolution.chain, 1);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}
module.exports = { findAndSavePokemon};