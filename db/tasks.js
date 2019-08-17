const db = require('./connection');

const { Schema } = db;

const TasksSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, },
    status: { type: String, required: true, default: 'pending' },
    author: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    project: { type: Schema.Types.ObjectId, required: true, ref: 'projects' },
    elements: [{ type: Schema.Types.ObjectId, ref: 'elements', required: false }],
    assignedTo: [{ type: Schema.Types.ObjectId, ref: 'users' }],
    friendlyId: { type: Number, required: true, default: 0, },
    requires: [{ type: Schema.Types.ObjectId, ref: 'tasks' }],
});

module.exports = db.model('tasks', TasksSchema);