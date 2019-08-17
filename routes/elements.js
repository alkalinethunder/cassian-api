const express = require('express');
const passport = require('passport');
const util = require('./util');
const Element = require('../db/elements');
const ElementType = require('../db/elementTypes');
const slugify = require('slugify');

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
                        // We don't need to send the entire element tree, only the root elements.
                        if(element.parent) {
                            continue;
                        }

                        // Prevent non-devs and non-authors from seeing suggestions.
                        if(!element.approved) {
                            if(!project.isDev(req.user) && !element.isAuthor(req.user)) {
                                continue;
                            }
                        }

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

router.post('/:project', passport.authenticate('jwt', { session: false }), function(req, res) {
    let projId = req.params.project;
    
    let payload = req.body;

    let response = {
        errors: [],
        success: false,
        element: null
    };
    
    // Make sure the element has a name, some content, and an element type.
    if(!payload.name) {
        response.errors.push('You must provide a name for the element.');
        res.json(response);
    } else if(!payload.content) {
        response.errors.push('You must provide Markdown content for the element.');
        res.json(response);
    } else if(!payload.type) {
        response.errors.push('Elements must have an element type.');
        res.json(response);
    } else {
        // Default parent id to null.
        if(!payload.parent) {
            payload.parent = null;
        }

        // Find accessible project by id.
        util.findAccessibleProject(req.user, projId, function(err, project) {
            if(project) {
                // Should the new element be a suggestion or approved element?
                let isSuggestion = !project.isDev(req.user);

                // Not all projects allow user-suggested elements, so throw an error if we're creating a suggestion and this project
                // doesn't allow that.
                if(isSuggestion && !project.allowSuggestions) {
                    response.errors.push('This project has disabled user-suggested game design elements. You must be a developer to create new design elements.');
                    return res.status(200).res.json(response);
                }

                // Create an element slug for better name resolution.
                let slug = slugify(payload.name);

                // Find existing element with this slug under the parent element of this project.
                Element.findOne({
                    slug: slug,
                    parent: payload.parent,
                    project: project
                }).exec(function(err, exists) {
                    // Don't allow creation of elements with the same name in the same parent.
                    if(exists) {
                        response.errors.push('The parent element already has an element with this name.');
                        res.json(response);
                    } else {
                        // Create a new element.
                        let element = new Element({
                            slug: slug,
                            name: payload.name,
                            content: payload.content,
                            parent: payload.parent,
                            elementType: payload.type,
                            project: project,
                            author: req.user
                        });

                        // Suggestions
                        if(isSuggestion) {
                            element.approved = false;
                        } else {
                            element.approvedBy = element.author;
                            element.approved = true;
                        }

                        // Save the element.
                        element.save(function(err, saved) {
                            if(saved) {
                                response.success = true;
                                response.element = saved.toJSON();
                                res.json(response);
                            } else {
                                response.errors.push('An internal server error has occurred trying to save the element.');
                                res.status(500).json(response);
                            }
                        });
                    }
                });
            } else {
                response.errors.push('Project not found or you do not have access to this project.');
                res.status(404).json(response);
            }
        });
    }
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

router.get('/:project/:id', util.optionalAuthenticate, function(req, res) {
    let projId = req.params.project;
    let elemId = req.params.id;

    let response = {
        errors: [],
        success: false,
        element: null,  
        children: [],
        parents: [],
    };

    util.findAccessibleProject(req.user, projId, function(err, project) {
        if(project) {
            Element.findOne({
                _id: elemId,
                project: project
            }).populate('author').populate('parent').populate("parent.elementType").populate('elementType').populate('parent').exec(function(err, element) {
                if(element) {
                    if(!element.approved) {
                        if(!project.isDev(req.user) && !element.isAuthor(req.user)) {
                            response.status(403).json('You must be the element author or a project developer to view this element suggestion.');
                            res.status(403).json(response);
                        }
                    } else {
                        response.element = element.toJSON();
                        util.getAccessibleChildren(req.user, project, element, function(err, children) {
                            if(children) {
                                for(let child of children) {
                                    response.children.push(child.toJSON());
                                }
                            }
                            
                            util.getParents(element, function(err, parents) {
                                response.parents = parents || [];
                                response.success = true;
                                res.json(response);
                            });
                        });
                    }
                } else {
                    response.errors.push('Element not found in this project.');
                    res.status(404).json(response);
                }
            });
        } else {
            response.errors.push('Project not found or you do not have access to this project.');
            res.status(404).json(response);
        }
    });
});

module.exports = router;