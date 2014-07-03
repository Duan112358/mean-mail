/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;


/**
 * Article Schema
 */
var UploadsSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
    },
    originalName: {
        type: String,
        default: '',
        trim: true
    },
    path:{
        type: String,
        default:'',
        trim: true
    },
    user: {
        type: Schema.ObjectId,
        ref: 'User'
    }
});

/**
 * Statics
 */
UploadsSchema.statics = {
    load: function(userId, cb) {
        this.find({
            user: userId
        }).sort('-created').populate('user', 'name username').exec(cb);
    }
};

mongoose.model('Uploads', UploadsSchema);