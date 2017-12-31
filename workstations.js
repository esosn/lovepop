const settings = require('./settings.js');
const taskQueue = require('task-queue');
const util = require('util');
// setTimeout is a function that asynchronously executes a callback after waiting a supplied number of ms.
// promisify converts it to a promise based function, rather than callback, which makes control flow easier.
const sleep = util.promisify(setTimeout);

// The worker pools - one for each type of operation
// Each pool has a given number of workers, each with the same capacity and processing time, defined in the settings
const workerPools = {};

// Track rows that are actively being processed; an array for each type of operation
const pending = {};

/**
 * @description Initializes the workstations
 * @param {array} orders: the list of orders to process
 */
module.exports.start = (orders) => {
    settings.operations.forEach(operation => {
        // initialize pending state to empty
        pending[operation] = [];

        // capacity is a library setting for the initial size of the backing structure; unused here
        // concurrency simulates having multiple instances of the same type of workstation running simultaneously
        const queue = taskQueue.Queue({ capacity: 10, concurrency: settings.counts[operation] });
        // Use a 'process' event as the queue empty handler, to continually ingest incoming batches
        // a running queue will immediately start incoming tasks, if it has available workers
        // need to remap the operation variable as it changes during loop iteration
        const thisOperation = operation;
        // Create a function closure as finished takes no parameters
        const processFunction = () => process(thisOperation);
        // Enqueue the initial tasks
        for (let i = 0; i < settings.counts[operation]; i++) {
            queue.enqueue(processFunction);
        }
        workerPools[operation] = queue;
    });

    // Populate data from the first order
    queueRows(orders);
    // Start the queues
    settings.operations.forEach(o => { workerPools[o].start(); });
}

/**
 * @description Breaks the list of orders up into priority sorted rows
 */
function queueRows(orders) {
    // Store the order number in each row, and ensure that the rows are processed in priority order,
    // and add them to the first step of the pipeline
    orders.forEach((order, i) => {
        order.rows.forEach((row) => {
            pending[settings.firstOperation].push({
                order: order.order,
                quantity: row.quantity,
                cardid: row.cardid,
                // map the priority to something like 1.123, for priority queue sorting
                // The ordinal is the order sequence and the decimal is the row's priority
                // This means that all rows from the first order get started before those from 
                // the second, and that intraorder rows are done in priority order
                priority: Number(`${i}.${row.priority}`)
            });
        });
    });
    // This sort puts lower numbered priority items first, as indicated in the spec
    pending[settings.firstOperation].sort((x, y) => x.priority - y.priority);
}

/**
 * @description processes a single unit
 * @param {string} operation: the operation the workstation performs
 */
function process(operation) {
    // Note that JS is single threaded, so this sync block will execute before any async handlers 
    // (such as the .then function at the end of this method), so this is actually safe to do -
    // there won't be an async read from the queue while the quantity logic executes. Handlers
    // get processed in the event loop, which fires when sync code yields control (stops processing)
    // But that doesn't mean that batches will necessarily complete in the same order - see .then({ ... }) below
    const batch = pending[operation].shift();
    // Don't do anything if there's nothing left - previous pipeline steps push into our queue
    // This will prevent a huge build up of unnecessary tasks in the worker queues
    if (!batch) {
        // Put this worker instance back in the pool
        workerPools[operation].enqueue(process, { args: [operation] });
        return;
    }
    let quantity = batch.quantity;
    // if we can't process the entire batch, grab as much as possible
    if (batch.quantity > settings.capacities[operation]) {
        // batch is a reference, so it's an in place modification
        batch.quantity -= settings.capacities[operation];
        pending[operation].unshift(batch);
        quantity = settings.capacities[operation];
    }

    console.info(`Started ${operation} for ${quantity} units of card ${batch.cardid} with priority ${batch.priority} for order ${batch.order}`);

    // simulate some amount of time to perform the work, then send the units down to the next step
    sleep(settings.times[operation] * quantity).then(() => {
        // local variables available via automatically created closure
        //console.info(`Completed ${operation} for ${quantity} units of card ${batch.cardid} with priority ${batch.priority} for order ${batch.order}`);

        // push items into the next step in the pipeline
        const next = settings.getNextStep(operation);
        if (next) {
            // Search the next queue for copies of this batch to combine units of the same batch
            const existing = pending[next].find(x => x.cardid === batch.cardid && x.order === batch.order);
            if (existing) {
                existing.quantity += quantity;
            }
            else {
                pending[next].push(batch);
                // Resort the queue. This is necessary because these steps are async so they complete
                // and get handled by the event loop in an arbitrary order, meaning that a simple
                // push does not guarantee the correct processing order
                // Really, these pending queues should be priority queues, but
                // this serves the initial purpose. The PQ implementation in the third party library
                // is function based and async - not suitable for the simple usage here
                pending[next].sort((x, y) => x.priority - y.priority);
            }
        }
        else {
            console.info(`Finished ${quantity} units of card ${batch.cardid} with priority ${batch.priority} for order ${batch.order}`);
        }

        // Put this worker instance back in the pool
        workerPools[operation].enqueue(process, { args: [operation] });
    });
};

