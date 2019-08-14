const connection = require('./connection');

const { Schema } = connection;

const ElementsSchema = new Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, required: true, ref: 'users' },
    project: { type: Schema.Types.ObjectId, required: true, ref: 'projects' },
    content: { type: String, required: true },
    parent: { type: Schema.Types.ObjectId, ref: 'elements' },
    approved: { type: Boolean, required: true, default: false },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'users' },
    elementType: { type: Schema.Types.ObjectId, ref: 'elementTypes', required: true }
});

ElementsSchema.methods.children = function(cb) {
    model.find({parent: this}).exec(cb);
};

const model = connection.model('elements', ElementsSchema);

module.exports = model;