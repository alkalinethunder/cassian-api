// Load dependencies
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan'); // Morgan Freeman?  Is that you?
const passport = require('passport');
const authenticationConfig = require('./config/authentication');

// Create an express app
const app = express();

// Activate and use all of the middleware
app.use(morgan('tiny')); // Senpai Morgan Freeman?
app.use(cors());
app.use(bodyParser.json()); // I'm Jason.  I'm in a fridge.

// Configure and initialize Passport.
authenticationConfig(passport);
app.use(passport.initialize());

// Projects router
app.use('/projects', require('./routes/projects'));
app.use('/auth', require('./routes/auth'));

// What port will we run on?
const port = process.env.PORT || 3000;

// Start Cassian up.
app.listen(port, () => {
    console.log("Time to kick ass and chew paperclips.  And I'm all out of paperclips.");
});
