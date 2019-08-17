const express = require('express');
const projects = require('../db/projects');
const passport = require('passport');
const slugify = require('slugify');
let users = require('../db/users');
let elements = require('../db/elements');
let elementTypes = require('../db/elementTypes');

// Utility functions so we don't have code duplication.
const util = require('./util');

var router = express.Router();

router.get('/', util.optionalAuthenticate, function(req, res) {
    let start = req.query.start || 0;
    let max = req.query.max || -1;
    if(start < 0) start = 0;
    if(max <= 0) max = -1;
    
    let response = {
        success: false,
        errors: [],
        projects: []
    };
    
    util.findAccessibleProjects(req.user, function(err, projects) {
        if(err) {
            response.errors.push('An unexpected error has occurred trying to fetch available projects.');
            res.json(response);
        } else {
            if(projects) {
                for(let i = start; i < projects.length && (max == -1 || i < start + max); i++) {
                    let project = projects[i];
                    response.projects.push(project.toJSON());
                }

                response.success = true;
                res.json(response);
            } else {
                response.errors.push('No projects could be found, possibly due to an unknown error.');
                res.json(response);
            }
        }
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

    if(payload.name == 'Coffee') {
        response.errors.push("I'm a teapot.");
        res.status(418).json(response);
    }

    // If there are any errors at this point, stop what we're doing.
    if(response.errors.length) {
        res.json(response);
    } else {
        // We need a url slug for url-and-human-friendly names.
        const slug = slugify(payload.name);

        // Part of the reason we need authentication is because Cassian Redux properly handles projects under users.
        // i.e, to get to The Peacenet by bitphoenixsoftware, you'd go to cassian.dev/bitphoenixsoftware/the-peacenet.
        // That allows other users to create projects called "The Peacenet," but only one project with the same name
        // can exist per user.  So we need to check the owner of the project as well when finding existing projects.
        //
        // Also, we need to check the slug instead for less buggy validation.
        //
        // I burst into laughter realizing that this ReferenceError has been in the code for days, un-noticed. - Michael
        // util.findProjectId(user.username, slug, function(err, id) {
        util.findProjectId(req.user.username, slug, function(err, id) {
            // If the project exists we need to throw an error back at the user.
            if(id) {
                response.errors.push('You already own a project with the same name.');
                res.json(response);
            } else {
                // Create a new project.
                let project = new projects({
                    name: payload.name,
                    slug: slug,
                    owner: req.user,
                    about: payload.about || "", // 'about' is optional, so we'll ensure it's not null/undefined.
                });

                // Save it...
                project.save(function(err, saved) {
                    if(saved) {
                        response.project = saved;
                        response.success = true;
                        res.json(response);
                    } else {
                        response.errors.push('Could not create project.');
                        res.json(response);
                    }
                });
            }
        });
    }
});

router.get('/:username', util.optionalAuthenticate, function(req, res) {
    let username = req.params.username;

    let response = {
        projects: [],
        errors: [],
        success: false
    };

    util.findOwnedProjects(req.user, username, function(err, projects) {
        if(err) {
            response.errors.push('An unexpected error has occurred.');
        } else {
            if(projects) {
                for(let project of projects) {
                    response.projects.push(project.toJSON());
                }
                response.success = true;
                res.json(response);
            } else {
                response.success = true;
                res.json(response);
            }
        }
    });
});

router.get('/:username/:project', util.optionalAuthenticate, function(req, res) {
    let username = req.params.username;
    let project = req.params.project;

    let response = {
        project: null,
        errors: [],
        success: false
    };

    util.findProjectId(username, project, function(err, id) {
        if(!id) {
            response.errors.push('Project not found.');
            res.status(404).json(response);
        } else {
            util.findAccessibleProject(req.user, id, function(err, project) {
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
    util.findProjectId(username, project, function(err, id) {
        if(!id) {
            response.errors.push('Project not found.');
            res.status(404).json(response);
        } else {
            // Find the project itself.
            util.findAccessibleProject(req.user, id, function(err, project) {
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
                            util.findProjectId(username, slugify(payload.name), function(err, exists) {
                                if(exists) {
                                    response.errors.push('A project with that name already exists.');
                                    res.json(response);
                                } else {
                                    project.name = payload.name;
                                    project.slug = slugify(payload.name);
                                    project.about = payload.description;
                                    if(payload.summary)
                                        project.summary = payload.summary;
                                    if(payload.tags)
                                        project.tags = payload.tags;

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
                            if(payload.summary)
                                project.summary = payload.summary;
                            if(payload.tags)
                                project.tags = payload.tags;
                                        
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