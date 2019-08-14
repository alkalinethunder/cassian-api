const mongoose = require('mongoose');

// Node shit
mongoose.promise = global.Promise;

// Connect to the server in debug mode
mongoose.connect('mongodb://localhost/cassian-redux', { useNewUrlParser: true });
mongoose.set('debug', true);

// Perform general cleanup once the db is connected.
mongoose.connection.once('open', function() {
    // Remove any users where their password hash is undefined.
    mongoose.model('users').remove({hash: undefined});

    // Remove any projects where their owner is undefined.
    mongoose.model('projects').remove({owner: undefined});
});

// Export the mongoose instance :P
module.exports = mongoose;