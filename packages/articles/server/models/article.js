'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;


/**
 *   Comment Schema
 */
var CommentSchema = {
    created: {
        type: Date,
        default: Date.now
    },
    nickname: {
        type: String,
        default: '',
        trim: true
    },
    email: {
        type: String,
        default: '',
        trim: true
    },
    homepage: {
        type: String,
        default: '',
        trim: true
    },
    comment: {
        type: String,
        default: '',
        trim: true
    }
};


/**
 * Article Schema
 */
var ArticleSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
    },
    title: {
        type: String,
        default: '',
        trim: true
    },
    preview: {
        type: String,
        default: '',
        trim: true
    },
    content: {
        type: String,
        default: '',
        trim: true
    },
    user: {
        type: Schema.ObjectId,
        ref: 'User'
    },
    votes: {
        type: Number,
        default: 0
    },
    comments: [CommentSchema],
    tags: [String]
});

/**
 * Validations
 */
ArticleSchema.path('title').validate(function(title) {
    return !!title;
}, 'Title cannot be blank');

ArticleSchema.path('content').validate(function(content) {
    return !!content;
}, 'Content cannot be blank');

/**
 * Statics
 */
ArticleSchema.statics.load = function(id, cb) {
    this.findOne({
        _id: id
    }).populate('user', 'name username').exec(cb);
};

mongoose.model('Article', ArticleSchema);
