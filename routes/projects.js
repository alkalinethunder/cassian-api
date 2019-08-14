const express = require('express');
const projects = require('../db/projects');
const passport = require('passport');
const slugify = require('slugify');
let users = require('../db/users');
let elements = require('../db/elements');
let elementTypes = require('../db/elementTypes');

var router = express.Router();

function findProjectId(username, projSlug, cb) {
    users.findOne({
        username
    }).exec(function(err, user) {
        if(err) {
            cb(err, null);
        }
        else {
            if(!user)
            {
                cb(null, false);
            }
            else {
                projects.findOne({
                    slug: projSlug,
                    owner: user
                }).exec(function(err, prj) {
                    if(err) {
                        cb(err, false);
                    }
                    else {
                        if(prj) {
                            cb(null, prj._id.toString());
                        } else {
                            cb(null, false);
                        }
                    }
                });
            }
        }
    })
}

function findAccessibleProject(user, projectId, cb) {
    if(user) {
        projects.findOne({
            $and: [
                {
                    _id: projectId
                },
                {
                    $or: [
                        { public: true },
                        { owner: user },
                        { admins: user },
                        { devs: user }
                    ]
                }
            ]
        }).exec(cb);
    }
    else {
        projects.findOne({
            _id: projectId,
            public: true
        }).exec(cb);
    }
}

router.get('/', function(req, res) {
    projects.find({}, (err, all) => {
        res.json({
            error: err,
            length: all.length,
            projects: all
        });
    });
});

router.post('/', passport.authenticate('jwt', { session: false }), function(req, res) {
    let payload = req.body;

    let response = {
        success: false,
        errors: [],
        project: null
    };

    // Basic validation of the project payload.
    if(!payload.name)
        response.errors.push('The project must have a name.');

    // If there are any errors at this point, stop what we're doing.
    if(response.errors.length)
    {
        res.json(response);
    }
    else
    {
        // We need a url slug for url-and-human-friendly names.
        const slug = slugify(payload.name);

        // Part of the reason we need authentication is because Cassian Redux properly handles projects under users.
        // i.e, to get to The Peacenet by bitphoenixsoftware, you'd go to cassian.dev/bitphoenixsoftware/the-peacenet.
        // That allows other users to create projects called "The Peacenet," but only one project with the same name
        // can exist per user.  So we need to check the owner of the project as well when finding existing projects.
        //
        // Also, we need to check the slug instead for less buggy validation.
        projects.findOne({
            owner: req.user,
            slug
        }).exec((err, project) => {
            // If the project exists we need to throw an error back at the user.
            if(project)
            {
                response.errors.push('You already own a project with the same name.');
                res.json(response);
            }
            else
            {
                // Create a new project.
                project = new projects({
                    name: payload.name,
                    slug: slug,
                    owner: req.user,
                    about: payload.about || "", // 'about' is optional, so we'll ensure it's not null/undefined.
                });

                // Save it...
                project.save((err, saved) => {
                    if(saved)
                    {
                        response.project = saved;
                        response.success = true;
                        res.json(response);
                    }
                    else
                    {
                        response.errors.push('Could not create project.');
                        res.json(response);
                    }
                });
            }
        });
    }
});

function optionalAuthenticate(req, res, next) {
    if(req.headers.authorization) {
        passport.authenticate('jwt', { session: false})(req, res, next);
    } else {
        next();
    }
}

router.get('/:username/:project', optionalAuthenticate, function(req, res) {
    let username = req.params.username;
    let project = req.params.project;

    let response = {
        project: null,
        errors: [],
        success: false
    };

    findProjectId(username, project, function(err, id) {
        if(!id) {
            response.errors.push('Project not found.');
            res.status(404).json(response);
        } else {
            findAccessibleProject(req.user, id, function(err, project) {
                if(!project) {
                    response.errors.push('You do not have permission to access this project.');
                    res.status(403).json(response);
                } else {
                    response.success = true;
                    response.project = project;
                    res.json(response);
                }
            });
        }
    });
});

router.post('/:username/:project/edit', passport.authenticate('jwt', { session: false }), function(req, res) {
    let username = req.params.username;
    let project = req.params.project;
    
    let payload = req.body;

    let response = {
        project: null,
        errors: [],
        success: false
    };

    // Find the project we're going to edit.
    findProjectId(username, project, function(err, id) {
        if(!id) {
            response.errors.push('Project not found.');
            res.status(404).json(response);
        } else {
            // Find the project itself.
            findAccessibleProject(req.user, id, function(err, project) {
                if(!project) {
                    response.errors.push('You do not have permission to modify this project.');
                    res.status(403).json(response);
                } else {
                    // Basic validation...
                    if(!payload.name) {
                        response.errors.push('You must provide a name for the project.');
                    }
                    if(!payload.description) {
                        response.errors.push('You must provide a description for the project.');
                    }
                    // Stop if we have errors.
                    if(response.errors.length) {
                        res.status(200).json(response);
                    } else {
                        // If the name is different, check for existing projects with the same name first.
                        if(project.name != payload.name) {
                            findProjectId(username, slugify(payload.name), function(err, exists) {
                                if(exists) {
                                    response.errors.push('A project with that name already exists.');
                                    res.json(response);
                                } else {
                                    project.name = payload.name;
                                    project.slug = slugify(payload.name);
                                    project.about = payload.description;
                                    project.save(function(err, saved) {
                                        response.success = true;
                                        response.project = saved;
                                        res.status(200).json(response);
                                    })
                                }
                            });
                        } else {
                            // Update only the description.
                            project.about = payload.description;
                            project.save(function(err, saved) {
                                response.success = true;
                                response.project = saved;
                                res.json(response);
                            })
                        }
                    }
                }
            });
        }
    });
});

module.exports = router;