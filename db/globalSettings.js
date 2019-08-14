// This allows us to store arbitrary global settings in the database.
// This is in place of the old secret.js file of Old Cassian, and allows storage of "secret" settings
// that don't need to be directly known by anyone, such as API keys for third-party services, secret
// keys for cryptography, etc.

const db = require('./connection');

const { Schema } = db;

// Essentially just a dictionary of settings.
const GlobalSettingsSchema = new Schema({
    key: String,
    value_json: String
});

var globalSettingsStore = db.model('globalSettings', GlobalSettingsSchema);

// Get a setting.
module.exports.getSetting = (key, callback) => {
    globalSettingsStore.findOne({ key }).exec((err, setting) => {
        if(setting)
            return callback(true, JSON.parse(setting.value_json));
        
        return callback(false, null);
    });
};

// Set a setting.
module.exports.setSetting = (key, value, callback) => {
    globalSettingsStore.findOne({ key }).exec((err, setting) => {
        if(setting)
        {
            setting.value_json = JSON.stringify(value);
            setting.save((err, setting) => {
                return callback(!err, setting);
            });
        }
        else
        {
            setting = new globalSettingsStore({
                key,
                value_json: JSON.stringify(value)
            });
            setting.save((err, setting) => {
                return callback(!err, setting);
            });
        }
    });
};

// Does a setting exist/
module.exports.hasSetting = (key, callback) => {
    globalSettingsStore.findOne({key}).exec((err, setting) => {
        callback(!!setting);
    });
}