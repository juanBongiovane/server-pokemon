const { findAndSavePokemon } = require('../utils/savePokemon');
const Pokedex = require("../models/Pokedex");

// quinta generacion hasta la 649

// for (let i = 100; i<=649; i++){
//     findAndSavePokemon(i).catch((error) => {
//         console.error("Error en findAndSavePokemon:", error);
//     });
// }

//
// const getPokemons = async () => {
//     try {
//         const pokemons = await Pokedex.find({ name: 'pichu' });
//         console.log(pokemons);
//     } catch (error) {
//         console.error('Error fetching pokemons:', error);
//     }
// };
//
// getPokemons();

exports.createPokemon = async (req, res) => {
    try {
        const newPokemon = new Pokedex(req.body);
        const savedPokemon = await newPokemon.save();
        res.json(savedPokemon);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getPokemon = async (req, res) => {

    try{
        const search = req.body.term;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 16;
        const skip = (page - 1) * limit ;

        if (search.trim() === 'default' || !search || search.trim() === '' ) {
            const dbResult = await Promise.all([
                Pokedex.countDocuments({ _id: { $gte: 1, $lte: 1000 } }),
                Pokedex.find({ _id: { $gte: 1, $lte: 1000 } })
                    .sort({ _id: 1 })
                    .skip(skip)
                    .limit(limit)]);

            res.json({
                total: dbResult[0],
                page,
                pages: Math.ceil(dbResult[0] / limit),
                pokemons: dbResult[1]
            });
        }else{
            const dbResult = await Promise.all([
                Pokedex.countDocuments({ name: { $regex: search, "$options": "i" } }),
                Pokedex.find({ name: { $regex: search, "$options": "i" } })
                    .sort({ _id: 1 })
                    .skip(skip)
                    .limit(limit)
            ]);

            res.json({
                total: dbResult[0],
                page,
                pages: Math.ceil(dbResult[0] / limit),
                pokemons: dbResult[1]
            });
        }

    }catch (error){
        res.status(500).json({ message: error.message });
    }
}
