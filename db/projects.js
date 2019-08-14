const db = require('./connection');

const { Schema } = db;

const projectsSchema = new Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true },
    about: String,
    owner: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    admins: [{type: Schema.Types.ObjectId, ref: 'users'}],
    devs: [{type: Schema.Types.ObjectId, ref: 'users'}],
    tags: [{type: String}],
    public: { type: Boolean, default: true, required: true }
});

projectsSchema.methods.isOwner = function(user) {
    return this.owner.toString() == user._id.toString();
}

projectsSchema.methods.elements = function(cb) {
    db.model('elements').find({project: this}).exec(cb);
}

projectsSchema.methods.elementTypes = function(cb) {
    db.model('elementTypes').find({project: this}).exec(cb);
}

module.exports = db.model('projects', projectsSchema);