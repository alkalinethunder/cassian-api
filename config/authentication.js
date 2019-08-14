const uuid = require('uuid');

var users = require('../db/users');
var globalSettings = require('../db/globalSettings');

var setup = function(p, secret) {
    var PassportJwt = require('passport-jwt');

    var opts = {};
    opts.jwtFromRequest = PassportJwt.ExtractJwt.fromAuthHeaderAsBearerToken();
    opts.secretOrKey = secret;

    p.use(new PassportJwt.Strategy(opts, (jwt_payload, done) => {
        console.log("Is this the real life?");
        users.findOne({email: jwt_payload.email}, (err, user) => {
            console.log("Is this just fantasy?");
            if(err)
                return done(err, false);
            
            if(user)
                return done(null, user);
            else
                return done(null, false);
        });
    }));
};

module.exports = function(passport) {
    globalSettings.getSetting('jwtSecret', (exists, secret) => {
        if(exists && !!secret)
        {
            return setup(passport, secret);
        }
        else
        {
            // generate a secret.
            secret = uuid().toString();
            globalSettings.setSetting('jwtSecret', secret, (success, newSecret) => {
                if(success && !!newSecret)
                {
                    return setup(passport, newSecret);
                }
                else
                {
                    console.error('FATAL CASSIAN ERROR: Could not generate and store the JWT secret for authentication.');
                    process.exit(-1);
                    return;
                }
            })
        }
    });
}