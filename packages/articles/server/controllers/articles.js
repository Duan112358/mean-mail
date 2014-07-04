'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Article = mongoose.model('Article'),
    _ = require('lodash'),
    moment = require("moment");


/**
 * Find article by id
 */
exports.article = function(req, res, next, id) {
    Article.load(id, function(err, article) {
        if (err) return next(err);
        if (!article) return next(new Error('Failed to load article ' + id));
        req.article = article;
        next();
    });
};

/**
 * Create an article
 */
exports.create = function(req, res) {
    var article = new Article(req.body);
    article.user = req.user;
    console.log(JSON.stringify(article));

    article.save(function(err) {
        if (err) {
            return res.jsonp(500, {
                error: err
            });
        }
        res.jsonp(article);

    });
};

/**
 * Update an article
 */
exports.update = function(req, res) {
    var article = req.article;

    article = _.extend(article, req.body);

    article.save(function(err) {
        if (err) {
            return res.jsonp(500, {
                error: 'Cannot update the article'
            });
        }
        res.jsonp(article);

    });
};

/**
 * Delete an article
 */
exports.destroy = function(req, res) {
    var article = req.article;

    article.remove(function(err) {
        if (err) {
            return res.jsonp(500, {
                error: 'Cannot delete the article'
            });
        }
        res.jsonp(article);

    });
};

/**
 * Show an article
 */
exports.show = function(req, res) {
    res.jsonp(req.article);
};

/**
 * List of Articles
 */
exports.all = function(req, res) {
    Article.find().sort('-created').populate('user', 'name username').exec(function(err, articles) {
        if (err) {
            return res.jsonp(500, {
                error: 'Cannot list the articles'
            });
        }
        res.jsonp(articles);

    });
};

exports.queryByTag = function(req, res, next, tag) {
    console.log(tag);
    Article.find({
        tags: {
            $in: [tag]
        }
    }).exec(function(err, articles) {
        if (err) return next(err);
        if (!articles) return next(new Error('Failed to load tag ' + tag));
        req.articles = articles;
        next();
    });

};

exports.queryByMonth = function(req, res, next, date) {
    Article.find({
        created: {
            $gte: date,
            $lt: moment(date).add('months', 1).format()
        }
    }).exec(function(err, articles) {
        if (err) return next(err);
        if (!articles) return next(new Error('Failed to load tag ' + tag));
        req.articles = articles;
        next();
    });
};
