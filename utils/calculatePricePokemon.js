function calculatePricePokemon(pokemon, stats, stages) {
    
    let baseStatTotal = 0;
    
    stats.stats.forEach((stat) => {
        baseStatTotal += stat.base_stat;
    });

    let isLegendary = 1;
    
    if (pokemon.is_legendary) {
        isLegendary = 2;
    }

    return baseStatTotal * isLegendary * stages;
}

module.exports = calculatePricePokemon;