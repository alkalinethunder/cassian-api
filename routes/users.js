const express = require('express');
const User = require('../db/users');
const util = require('./util');

var router = express.Router();

router.get('/', function(req, res) {
    let response = {
        success: false,
        errors: [],
        users: []
    };

    User.find().exec(function(err, users) {
        if(users) {
            response.success = true;
            for(let user of users) {
                response.users.push(user.toJSON());
            }
            res.json(response);
        } else {
            response.errors.push('An error occurred fetching all users.');
            res.json(response);
        }
    });
});

router.get('/id/:id', function(req, res) {
    let id = req.params.id;

    let response = {
        errors: [],
        success: false,
        user: null
    };

    User.findOne({ _id: id }).exec(function(err, user) {
        if(user) {
            response.success = true;
            response.user = user.toJSON();
            res.json(response);
        } else {
            response.errors.push('A user with that ID does not exist.');
            res.status(404).json(response);
        }
    });
});

router.get('/username/:username', function(req, res) {
    let username = req.params.username;

    let response = {
        errors: [],
        success: false,
        user: null
    };

    User.findOne({ username }).exec(function(err, user) {
        if(user) {
            response.success = true;
            response.user = user.toJSON();
            res.json(response);
        } else {
            response.errors.push('A user with that username does not exist.');
            res.status(404).json(response);
        }
    });
})

module.exports = router;