const workstations = require('./workstations.js');
const settings = require('./settings.js');

// Load the inputs, expecting an array of order objects which fit this schema:
// {
//     "order": int,
//     "rows": [{
//         "cardid": int,
//         "quantity": int,
//         "priority": int
//     }]
// }
const orders = require('./input.json');

// Make sure that each step in the pipeline has enough capacity to process an entire order
// Get the maximum capacity for all orders
const maxSize = orders.reduce((max, cur) => {
    return Math.max(max, cur.rows.reduce((rowMax, row) => {
        return Math.max(rowMax, row.quantity);
    }, 0));
}, 0);
console.info(`Biggest row quantity: ${maxSize}; adjusted worker counts:`);
// Figure out the necessary quantity of workstations for each step
settings.operations.forEach(operation => {
    settings.counts[operation] = Math.max(
        settings.counts[operation], 
        Math.ceil(maxSize / settings.capacities[operation])
    );
    console.info(`   ${operation}: ${settings.counts[operation]}`);
})

workstations.start(orders);
