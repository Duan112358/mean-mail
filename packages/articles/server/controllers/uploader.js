/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    async = require('async'),
    Uploads = mongoose.model('Uploads'),
 

/**
 * Find images by username
 */
exports.getFiles = function(req, res, next, userId) {
    console.log('getfiles : ' + userId);
    Uploads.load(userId, function(err, uploads) {
        if (err) return next(err);
        if (!uploads) return next(new Error('Failed to load file ' + id));
        res.uploads = uploads;
        next();
    });
};

/**
 * upload a image
 */
exports.upload = function(req, res) {
    var file = req.files.file;
    var path = file.path;
    var filename = path.substr(path.lastIndexOf('\\') + 1);
    console.log(filename);
    var uploads = new Uploads({
        originalName: file.name,
        path: '/img/uploads/' + filename,
        user: req.user
    });

    uploads.save(function(err) {
        if (err) {
            return res.send(401, {
                errors: err.errors,
                uploads: uploads
            });
        } else {
            res.jsonp(uploads);
        }
    });
};


/**
 * Delete an image
 */
exports.destroy = function(req, res) {
    var uploads = req.uploads;

    uploads.remove(function(err) {
        if (err) {
            res.render('error', {
                status: 500
            });
        } else {
            res.jsonp(uploads);
        }
    });
};

/**
 * Show an article
 */
exports.show = function(req, res) {
    res.jsonp(res.uploads);
};

/**
 * List of Articles
 */
exports.all = function(req, res) {
    Uploads.find().sort('-created').populate('user', 'name username').exec(function(err, uploads) {
        if (err) {
            res.render('error', {
                status: 500
            });
        } else {
            res.jsonp(uploads);
        }
    });
};

exports.queryByDate = function(req, res) {
    var date = req.body.date;
    Uploads.find({
        user: req.user._id,
        created: {
            $gte: date
        }
    }).exec(function(err, data) {
        if (err) {
            res.render('error', {
                status: 500
            });
        } else {
            res.jsonp(data);
        }
    })
};