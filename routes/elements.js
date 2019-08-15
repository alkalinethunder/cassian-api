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
})

module.exports = router;