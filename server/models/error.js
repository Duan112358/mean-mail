'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/**
 * Error Schema
 */
var ErrorSchema = new Schema({
    username: String,
    roles: {
        type: Array,
        default: ['authenticated']
    },
    from: String,
    data: String,
    created: Date,
    desc: String
});

mongoose.model('Error', ErrorSchema);
