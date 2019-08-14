// Mongoose library
const mongoose = require('mongoose');

// Passport library
const passport = require('passport');

// Data models for Cassian.
var Project = require('../db/projects');
var User = require('../db/users');
var Element = require('../db/elements');
var ElementType = require('../db/elementTypes');

/**
 * Finds the project with the specified ID if the specified user has access to it.  If an invalid user is specified,
 * then only public projects will be fetched.  Otherwise, projects that are either public, or have the user listed as an
 * owner, developer or administrator will be fetched.
 * 
 * @param {User} user The user that's trying to access the project.
 * @param {mongoose.Types.ObjectId} id The ID of the project to access.
 * @param {projectFetchCallback} cb The callback that performs an action with the fetched project or handles errors.
 * 
 * @summary Finds an accessible project given the specified user and project ID.
 */
module.exports.findAccessibleProject = function(user, id, cb) {
    if(user) {
        Project.findOne({
            $and: [
                { _id: id },
                {
                    $or: [
                        { owner: user },
                        { admins: user },
                        { devs: user },
                        { public: true},
                    ],
                },
            ],
        }).exec(cb);
    } else {
        Project.findOne({
            _id: id,
            public: true
        }).exec(cb);
    }
}

/**
 * Finds all accessible projects for the user.  If the user is invalid,
 * only public projects will be found.  Otherwise, projects that are either public
 * or have the user listed as an owner, developer or administrator will be found.
 * 
 * @param {User} user The user trying to access the project list.
 * @param {projectListFetchCallback} cb The callback that handles the result of the fetch.
 * 
 * @summary Fetches a list of accessible projects given a user.
 */
module.exports.findAccessibleProjects = function(user, cb) {
    if(user) {
        Project.find({
            $or: [
                { owner: user },
                { admins: user },
                { devs: user },
                { public: true },
            ],
        }).exec(cb);
    } else {
        Project.find({
            public: true
        }).exec(cb);
    }
}

/**
 * Finds a project ID given the specified username and project slug.  The function first
 * finds a user with the specified username, and then finds a project with the matching slug that's
 * owned by the user.  Doing it this way allows multiple users to create projects with the same name.
 * 
 * @param {string} username The username of the user that owns the project.
 * @param {string} projSlug The URL slug of the project to find.
 * @param {projectIdCallback} cb The callback function that handles the result of the ID fetch.
 * 
 * @summary Finds a project ID given the specified username and slug.
 */
module.exports.findProjectId = function(username, projSlug, cb) {
    User.findOne({ username }).exec(function(err, user) {
        if(err) {
            cb(err, null);
        } else {
            if(!user) {
                cb(null, false);
            } else {
                Project.findOne({
                    slug: projSlug,
                    owner: user
                }).exec(function(err, prj) {
                    if(err) {
                        cb(err, false);
                    } else {
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

/**
 * Finds all accessible projects for the given user that are owned by the given owner username.  First,
 * the function find a user with the matching owner username, then it finds all projects owned by this user that are
 * acccessible to the given accessing user.
 * 
 * @param {User} user The user trying to access the project list.
 * @param {string} owner The owner of the projects to find.
 * @param {projectListFetchCallback} cb The callback that handles the result of the fetch.
 * 
 * @summary Finds all projects owned by the owner username that are accessible to the given user.
 */
module.exports.findOwnedProjects = function(user, owner, cb) {
    User.findOne({ username: owner }).exec(function(err, u) {
        if(err) {
            cb(err, false);
        } else {
            if(u) {
                if(user) {
                    Project.find({
                        $and: [
                            { owner: u },
                            {
                                $or: [
                                    { admins: user },
                                    { devs: user },
                                    { owner: user },
                                    { public: true },
                                ],
                            },
                        ],
                    }).exec(cb);
                } else {
                    Project.find({
                        public: true,
                        owner: u
                    }).exec(cb);
                }
            } else {
                cb(null, false);
            }
        }
    });
}

/**
 * Checks the Authorization header of an incoming request.  If the header is present, then
 * a JWT authentication will be performed before the request is allowed to be handled.  Otherwise,
 * the request will be handled as if the user is not logged in.
 * 
 * @param {IncomingRequest} req The incoming HTTP request to check.
 * @param {Response} res The resulting HTTP response.
 * @param {function} next The function to call once the authentication check is performed.
 * 
 * @summary Allows API endpoints to be optionally authenticated.
 * 
 * @example 
*   // Allows the '/projects' endpoint to be accessible by both guests and logged in users,
*   // storing user info in req.user if the user is authenticated.
 *  router.get('/projects', util.optionalAuthenticate, function(req, res) {
 *      if(req.user) {
 *          console.log('User is authenticated');
 *      } else {
 *          console.log('User is a guest');
 *      }
 *  });
 */
module.exports.optionalAuthenticate = function(req, res, next) {
    if(req.headers.authorization) {
        passport.authenticate('jwt', { session: false})(req, res, next);
    } else {
        next();
    }
}

/**
 * Handles the result of project ID fetches.
 * @callback projectIdCallback
 * @param {any} err Contains any errors that may have occurred.
 * @param {mongoose.Types.ObjectId} id The ID of the project that was found, or false if no project was found.
 */

/**
 * Handles the result or errors of a project fetch.
 * @callback projectFetchCallback
 * @param {any} err Contains any errors that may have occurred during the fetch.
 * @param {Project} result Contains the project that was fetched, or false if a project was not found.
 */

/**
 * Handles the result or errors of a project list fetch.
 * @callback projectListFetchCallback
 * @param {any} err Contains any errors that may have occurred during the fetch.
 * @param {Project[]} result Contains an array of found projects.
 */