const express = require("express");
const util = require('./util');
const Project = require('../db/projects');
const Element = require('../db/elements');
const User = require('../db/users');
const Task = require('../db/tasks');

var router = express.Router();

router.get('/:project', util.optionalAuthenticate, function(req, res) {
    let projId = req.params.project;

    let response = {
        errors: [],
        success: false,
        tasks: []
    };

    // Find accessible project based on the id given.
    util.findAccessibleProject(req.user, projId, function(err, project) {
        if(project) {
            project.tasks().exec(function(err, tasks) {
                if(tasks) {
                    for(let task of tasks) {
                        response.tasks.push(task.toJSON());
                    }
                    response.success = true;
                    res.json(response);
                } else {
                    response.errors.push('An internal server error occurred while fetching this project\'s tasks.');
                    res.status(500).json(response);
                }
            });
        } else {
            response.errors.push('Project not found or you do not have access to this project.');
            res.status(404).json(response);
        }
    });
});

module.exports = router;