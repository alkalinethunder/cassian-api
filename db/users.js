const crypto =require('crypto');
const db = require('./connection');

const { Schema } = db;

const UsersSchema = new Schema({
    email: { type: String, required: true, unique: true },
    hash: { type: String, required: true },
    salt: {type: String, required: true },
    fullName: String,
    username: { type: String, unique: true, required: true },
    about: String,
    websiteURL: String,
    githubURL: String,
    avatarURL: String,
    coverURL: String,
    preferFullName: Boolean
});

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