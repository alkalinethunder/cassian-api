const express = require('express');
const users = require('../db/users');
const globalSettings = require('../db/globalSettings');
const jwt = require('jsonwebtoken');
const passport = require('passport');

var router = express.Router();

router.post('/create-user', function(req, res) {
    // The payload that was sent to us.
    let payload = req.body;

    // The payload we'll send back.
    let response = {
        errors: [],
        success: false
    };

    // Basic validation.
    if(!payload.email || !payload.password || !payload.username)
        response.errors.push('You must provide an email, password, and a username.');
    
    // Do the email and passwords match their confirm counterparts?
    if(payload.email !== payload.confirmEmail)
        response.errors.push('Emails do not match.');

    if(payload.password !== payload.confirmPassword)
        response.errors.push('Passwords do not match.');

    // If there are errors then we'll send them.
    if(response.errors.length)
    {
        res.status(200).json(response);
    }
    else {

        // Create a new user.
        var newUser = new users({
            email: payload.email,
            username: payload.username
        });

        // Set the password of the user.
        newUser.setPassword(payload.password);

        // Save the user.
        newUser.save((err, usr) => {
            if(err)
            {
                response.errors.push('The username or email provided is already taken.');
            }
            else
            {
                response.success = true;
            }
            return res.json(response);
        });
    }
});

router.post('/login', function(req, res) {
    // The payload that was sent to us
    let payload = req.body;

    // Our response
    let response = {
        errors: [],
        success: false,
        token: ''
    };

    users.findOne({ email: payload.email }).exec((err, user) => {
        if(err) throw err;

        if(!user)
        {
            response.errors.push('No user with that email was found.');
            return res.status(401).json(response);
        }

        if(!user.validatePassword(payload.password))
        {
            response.errors.push('The password you entered was invalid.');
            return res.status(401).json(response);
        }

        // Get the JWT secret...
        globalSettings.getSetting('jwtSecret', (exists, secret) => {
            if(exists && !!secret)
            {
                // Create a token.
                var token = jwt.sign(user.toJSON(), secret);
                response.success = true;
                response.token = 'Bearer ' + token;
                
                return res.json(response);
            }
            else
            {
                response.errors.push('Cassian has not finished initializing yet.  Please try again later.');
                return res.status(401).json(response);
            }
        });
    });
});

router.get('/userinfo', passport.authenticate('jwt', { session: false }), function(req, res) {
    res.json(req.user);
});

module.exports = router;
