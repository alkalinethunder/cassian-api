const express = require("express");
const passport = require('passport');
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

router.post('/:project', passport.authenticate('jwt', { session: false }), function(req, res) {
    let projId = req.params.project;

    let payload = req.body;

    let response = {
        errors: [],
        success: false,
        task: null
    };

    // Basic validation.
    if(!payload.name) {
        response.errors.push('You must specify a task name.');
        res.json(response);
    } else {
        if(!payload.element) {
            payload.element = null;
        }

        // Find accessible project.
        util.findAccessibleProject(req.user, projId, function(err, project) {
            if(project) {
                if(!project.isDev(req.user)) {
                    response.errors.push('You must be a developer of the project to create tasks.');
                    res.status(403).json(response);
                } else {
                    // Find an existing task with the same name in the project.
                    Task.findOne({
                        project: project,
                        name: payload.name
                    }).exec(function(err, exists) {
                        if(exists) {
                            response.errors.push('A task with that name already exists.');
                            res.json(response);
                        } else {
                            util.findElement(project, payload.element, function(err, wasElement, element) {
                                if(wasElement && !element) {
                                    response.errors.push('The specified design element for this new task was not found in the project.');
                                    res.status(418).json(response);  // The resulting response is short and stout.
                                } else {
                                    let newTask = new Task({
                                        friendlyId: project.friendlyId(),
                                        name: payload.name,
                                        description: payload.description,
                                        element: element,
                                        project: project,
                                        author: req.user,
                                        status: 'pending',
                                    });

                                    newTask.save(function(err, saved) {
                                        if(saved) {
                                            response.task = saved.toJSON();
                                            response.success = true;
                                            res.json(response);
                                        } else {
                                            response.errors.push('An internal server error occurred while saving the task.');
                                            res.status(500).json(response);
                                        }
                                    });
                                }
                            })
                        }
                    });
                }
            } else {
                response.errors.push('Project not found or you do not have access to the project.');
                res.status(404).json(response);
            }
        });
    }
});

router.get('/:project/:friendlyId', util.optionalAuthenticate, function(req, res) {
    let projId = req.params.project;
    let friendlyId = req.params.friendlyId;

    let response = {
        errors: [],
        success: false,
        task: null,
    };

    util.findAccessibleProject(req.user, projId, function(err, project) {
        if(project) {
            Task.findOne({
                friendlyId: friendlyId,
                project: project
            }).populate('author').populate('element').exec(function(err, task) {
                if(task) {
                    response.success = true;
                    response.task = task.toJSON();
                    res.json(response);
                } else {
                    response.errors.push('A task with that ID was not found.');
                    res.status(404).json(response);
                }
            });
        } else {
            response.errors.push('Project not found or you do not have access to this project.');
            res.status(403).json(response);
        }
    });
})

module.exports = router;