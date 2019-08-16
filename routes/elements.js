const express = require('express');
const passport = require('passport');
const util = require('./util');
const Element = require('../db/elements');
const ElementType = require('../db/elementTypes');

var router = express.Router();

router.get('/:project', util.optionalAuthenticate, function(req, res) {
    let projId = req.params.project;
    
    let response = {
        errors: [],
        success: false,
        elements: []
    };

    util.findAccessibleProject(req.user, projId, function(err, project) {
        if(project) {
            project.elements().exec(function(err, elements) {
                if(elements) {
                    response.success = true;
                    for(let element of elements) {
                        response.elements.push(element.toJSON());
                    }
                    res.json(response);
                } else {
                    response.errors.push('An internal error occurred fetching this project\'s elements.');
                    res.status(500).json(response);
                }
            });
        } else {
            response.errors.push('Project not found, or you do not have permission to access this project.');
            res.status(404).json(response);
        }
    });
});

router.get('/types/:project', util.optionalAuthenticate, function(req, res) {
    let projId = req.params.project;
    
    let response = {
        errors: [],
        success: false,
        types: []
    };

    util.findAccessibleProject(req.user, projId, function(err, project) {
        if(project) {
            project.elementTypes(function(err, elementTypes) {
                if(elementTypes) {
                    if(elementTypes.length) {
                        response.success = true;
                        for(let elementType of elementTypes) {
                            response.types.push(elementType.toJSON());
                        }
                        res.json(response);
                    } else {
                        var etype = new ElementType({
                            project,
                            icon: 'fa fas fa-folder',
                            label: 'Folder'
                        });

                        etype.save(function(err, t) {
                            if(t) {
                                response.success = true;
                                response.types.push(t.toJSON());
                                res.json(response);
                            } else {
                                response.errors.push('An internal error has occurred initializing this project\'s element type list. Perhaps a Cassian bug?');
                                res.status(500).json(response);
                            }
                        })
                    }
                } else {
                    response.errors.push('An internal error occurred fetching this project\'s element types.');
                    res.status(500).json(response);
                }
            });
        } else {
            response.errors.push('Project not found, or you do not have permission to access this project.');
            res.status(404).json(response);
        }
    });
});

router.post('/type/:id/delete', passport.authenticate('jwt', { session: false }), function(req, res) {
    let id = req.params.id;
    
    let response = {
        errors: [],
        success: false
    };

    ElementType.findOne({ _id: id }).exec(function(err, type) {
        if(type) {
            if(type.canDelete()) {
                util.findAccessibleProject(req.user, type.project, function(err, project) {
                    if(project && project.isAdmin(req.user)) {
                        ElementType.findOneAndRemove({
                            _id: id
                        }).exec(function(err, deleted) {
                            if(deleted) {
                                response.success = true;
                                res.json(response);
                            } else {
                                response.errors.push('Could not delete this element type due to an error.');
                                res.status(500).json(response);
                            }
                        });
                    } else {
                        response.errors.push('You do not have permission to delete element types from this project.');
                        res.status(403).json(response);
                    }
                });
            } else {
                response.errors.push('You cannot delete a project\'s "Folder" element type.');
                res.json(response);
            }
        } else {
            response.errors.push('Element type not found.');
            res.status(404).json(response);
        }
    });
});

router.post('/types/:project', passport.authenticate('jwt', { session:  false }), function(req, res) {
    let projId = req.params.project;

    let payload = req.body;

    let response = {
        success: false,
        errors: [],
        type: null
    };

    if(!payload.label) {
        response.errors.push('You must provide a label for the new element type.');
        res.json(response);
    } else {
        payload.icon = payload.icon || 'fa fa-folder';

        util.findAccessibleProject(req.user, projId, function(err, project) {
            if(project && project.isAdmin(req.user)) {
                ElementType.findOne({
                    project: project,
                    label: payload.label
                }).exec(function(err, exists) {
                    if(exists) {
                        response.errors.push('This project already has an element type with that name.');
                        res.json(response);
                    } else {
                        let type = new ElementType({
                            project: project,
                            label: payload.label,
                            icon: payload.icon
                        });

                        type.save(function(err, saved) {
                            if(saved) {
                                response.success = true;
                                response.type = saved.toJSON();
                                res.json(response);
                            } else {
                                response.errors.push('An internal error has occurred while saving the element type.');
                                res.status(500).json(response);
                            }
                        });
                    }
                })
            } else {
                response.errors.push('Project does not exist or you are not an admin of the project.');
                res.status(404).json(response);
            }
        });
    }
});

module.exports = router;