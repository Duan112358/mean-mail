'use strict';

var mongoose = require('mongoose');

var crypto = require('crypto');

module.exports.log = function(data, user, desc) {
    var Error = mongoose.model('Error');
    var error = new Error({
        from: user.email,
        data: data,
        roles: user.roles,
        created: new Date(),
        username: user.username,
        desc: desc
    });
    error.save(function(err) {
        if (err) {
            console.log(err);
        }
    });
};

module.exports.allLogs = function(callback) {
    var Error = mongoose.model('Error');
    Error.find().sort('-created').exec(function(err, logs) {
        if (err) {
            callback({
                error: err
            })
            console.log(err);
        } else {
            callback(logs);
        }
    });
};

module.exports.searchLog = function(query, callback) {
    var Error = mongoose.model('Error');
    Error.find(query).sort('-created').exec(function(err, logs) {
        if (err) {
            callback({
                error: err
            })
            console.log(err);
        } else {
            callback(logs);
        }
    });
};

module.exports.decipherPass = function(user) {
    if (!user) {
        throw new Error('user cannot be null');
    }
    var decipher = crypto.createDecipher('blowfish', user.salt);
    var decrypted = decipher.update(user.email_password, 'hex', 'binary');
    decrypted += decipher.final('binary');
    return decrypted;
};

module.exports.getUser = function(id, callback) {
    var User = mongoose.model('User');
    User.findOne({
        _id: id
    }).exec(callback);
}
