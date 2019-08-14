const crypto =require('crypto');
const db = require('./connection');

const { Schema } = db;

const UsersSchema = new Schema({
    email: { type: String, required: true, unique: true },
    hash: { type: String, required: true },
    salt: {type: String, required: true },
    fullName: { type: String, default: '' },
    username: { type: String, unique: true, required: true },
    about: { type: String, default: '' },
    websiteURL: { type: String, default: '' },
    githubURL: { type: String, default: '' },
    avatarURL: { type: String, default: '' },
    coverURL: { type: String, default: '' },
    preferFullName: { type: Boolean, default: false }
});

UsersSchema.methods.toJSON = function(stripEmail = true) {
    var obj = this.toObject();

    // Strip the password hash and salt.
    delete obj.hash;
    delete obj.salt;

    // Strip the email.  Not everyone needs to know a user's email.
    if(stripEmail) {
        delete obj.email;
    }

    return obj;
}

UsersSchema.methods.setPassword = function(password) {
    // Generate a new salt.
    this.salt = crypto.randomBytes(16).toString('hex');

    // Hash it.
    this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UsersSchema.methods.validatePassword = function(password) {
    let testHash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
    return this.hash === testHash;
};

module.exports = db.model('users', UsersSchema);