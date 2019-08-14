const connection = require('./connection');

const { Schema } = connection;

const ElementTypesSchema = new Schema({
    label: { type: String, required: true },
    project: { type: Schema.Types.ObjectId, ref: 'projects', required: true },
    icon: { type: String, required: true, default: 'fa fa-folder' }
});

module.exports = connection.model('elementTypes', ElementTypesSchema);