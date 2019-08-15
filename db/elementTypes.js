const connection = require('./connection');

const { Schema } = connection;

const ElementTypesSchema = new Schema({
    label: { type: String, required: true },
    project: { type: Schema.Types.ObjectId, ref: 'projects', required: true },
    icon: { type: String, required: true, default: 'fa fa-folder' }
});

ElementTypesSchema.methods.toJSON = function() {
    var obj = this.toObject();
    obj.project = obj.project._id.toString();
    return obj;
}

ElementTypesSchema.methods.canDelete = function() {
    return this.label != 'Folder';
}

module.exports = connection.model('elementTypes', ElementTypesSchema);