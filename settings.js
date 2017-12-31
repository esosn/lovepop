
// Define the sequence of operations necessary to generate a card
// They'll always be iterated over in the given order
module.exports.operations = [ 'paper', 'cut', 'assemble', 'glue', 'pack' ];
module.exports.firstOperation = 'paper';

// Settings indicating how many milliseconds a workstation of a given type takes to process a single unit
// Change as desired to see how the simulation adjusts
module.exports.times = {
    paper: 20,
    cut: 70,
    assemble: 40,
    glue: 15,
    pack: 30
};

// Settings represent the number of available workstations and their capacities of a given type
// Change as desired to see how the simulation adjusts
module.exports.counts = {
    paper: 3,
    cut: 3,
    assemble: 3,
    glue: 3,
    pack: 3
};
module.exports.capacities = {
    paper: 40,
    cut: 60,
    assemble: 45,
    glue: 55,
    pack: 25    
}

/**
 * @description Gets the next step in the pipeline given the current one
 * @param {string} operation: the current operation 
 * @returns {string}: the next step, or null if finished
 */
module.exports.getNextStep = (operation) => {
    switch (operation) {
        case 'paper': return 'cut';
        case 'cut': return 'assemble';
        case 'assemble': return 'glue';
        case 'pack': return 'pack';
        default: return null;
    }
}