This is a command line program running in NodeJS, picked for its ease of handling asynchronous control flows, which is the inuitive approach for this problem. Instructions to run:
Install Node: https://nodejs.org/en/download/
Be sure to include the npm package manager during installation.
Navigate to the folder in your shell (suggest powershell in Windows)
Update input.json as desired to represent an array of orders, and settings.js to change workstation simulation values
Run "npm install" on the command line 
Run "node index.js" on the command line
Use the console break command (CTRL+C in unix/powershell) to halt processing

Future improvements I'd make:
- Robust error handling
- Unit tests
- Use proper priority queue implementation for 'pending' rows
- Automatic termination when orders are all finished
- A proper event based pipeline, which would permit distributed processing for scaling
- An async order input flow (e.g. Kafka pipeline)

Third party packages used:
Async task queue library: https://www.npmjs.com/package/task-queue - provided an easy way of setting up multiple concurrent async tasks