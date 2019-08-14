# Project: Cassian
## REST API

Project: Cassian is our collaborative game design platform.  This is the REST API that serves as a backend for the platform.  It manages all projects, users, game design elements, tasks and more so all you have to do is ask about them.

### Requirements

If you want to run your own API instance, you'll need these installed:

 - Node.js
 - MongoDB (for data storage)
 - A good sense of humor.

You're on your own for installing these requirements, the first two should be easy.  Not too sure about the third -- depends on the person.

### Getting up and running

In order to get the API running, all you have to do is do

```
npm install
node index.js
```

and Cassian will do the rest.

### Warning about Old Cassian

This API's data models ARE NOT COMPATIBLE with the ones from Old Cassian.  If you've had an Old Cassian instance running on your system, you may want to clear out the `cassian` database in your MongoDB before trying to run this REST API to prevent fuck-ups.