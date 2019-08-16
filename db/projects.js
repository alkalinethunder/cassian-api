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
    public: { type: Boolean, default: true, required: true },
    summary: { type: String, default: '' }
});

projectsSchema.methods.isOwner = function(user) {
    if(!user) {
        return false;
    }
    return this.owner.toString() == user._id.toString() || this.owner._id.toString() == user._id.toString();
}

projectsSchema.methods.isAdmin = function(user) {
    if(!user) {
        return false;
    }
    
    if(this.isOwner(user)) {
        return true;
    } else {
        for (let admin of this.admins) {
            if(admin == user._id.toString() || admin._id.toString() == user._id.toString()) {
                return true;
            }
        }
        return false;
    }
}

projectsSchema.methods.elements = function() {
    return db.model('elements').find({project: this}).populate('author').populate('elementType');
}

projectsSchema.methods.elementTypes = function(cb) {
    db.model('elementTypes').find({project: this}).exec(cb);
}

module.exports = db.model('projects', projectsSchema);