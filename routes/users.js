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

module.exports = router;