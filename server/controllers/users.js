'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    User = mongoose.model('User');

/**
 * Auth callback
 */
exports.authCallback = function(req, res) {
    res.redirect('/');
};

/**
 * Show login form
 */
exports.signin = function(req, res) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.redirect('#!/login');
};

/**
 * Logout
 */
exports.signout = function(req, res) {
    req.logout();
    res.redirect('/');
};

exports.changepass = function(req, res) {
    var _user = new User(req.body);

    if(!_user.emailPassword){
        return res.status(400).send([{param: 'emailPassword', msg: '邮箱密码不能为空'}]);
    }

    if(_user.password.length < 8 || _user.password.length > 20){
        return res.status(400).send([{param: 'password', msg: '密码长度必须介于8-20个字符的长度'}]);
    }

    if(_user.comfirmPassword !== _user.password){
        return res.status(400).send([{param: 'password', msg: '密码和确认密码不匹配'}]);    }

    User.findOne({
        '_id': _user._id
    }).exec(function(err, user) {
        user.emailPassword = _user.emailPassword;
        user.password = _user.password;
        user.confirmPassword = _user.confirmPassword;

        user.save(function(err) {
            if (err) {
                console.log(err);
                switch (err.code) {
                    default:
                        res.status(400).send('亲，请仔细填写必填项！');
                }

                return res.status(400);
            }
            req.logIn(user, function(err) {
                if (err) return next(err);
                return res.redirect('/');
            });
            res.status(200);
        });

    });
}

/**
 * Session
 */
exports.session = function(req, res) {
    res.redirect('/');
};

/**
 * Create user
 */
exports.create = function(req, res, next) {
    var user = new User(req.body);

    user.provider = 'local';

    // because we set our user.provider to local our models/user.js validation will always be true
    req.assert('name', '用户名不能为空').notEmpty();
    req.assert('email', '邮箱格式不正确').isEmail();
    req.assert('emailPassword', '邮箱密码不能为空').notEmpty();
    req.assert('password', '密码长度必须介于8-20个字符的长度').len(8, 20);
    req.assert('username', '昵称的长度不能超过20个字符').len(1, 20);
    req.assert('confirmPassword', '密码和确认密码不匹配').equals(req.body.password);

    var errors = req.validationErrors();
    if (errors) {
        return res.status(400).send(errors);
    }

    // Hard coded for now. Will address this with the user permissions system in v0.3.5
    user.roles = ['authenticated'];
    user.save(function(err) {
        if (err) {
            switch (err.code) {
                case 11000:
                case 11001:
                    res.status(400).send('用户名已经存在');
                    break;
                default:
                    res.status(400).send('亲，请仔细填写必填项！');
            }

            return res.status(400);
        }
        req.logIn(user, function(err) {
            if (err) return next(err);
            return res.redirect('/');
        });
        res.status(200);
    });
};
/**
 * Send User
 */
exports.me = function(req, res) {
    res.jsonp(req.user || null);
};

/**
 * Find user by id
 */
exports.user = function(req, res, next, id) {
    User
        .findOne({
            _id: id
        })
        .exec(function(err, user) {
            if (err) return next(err);
            if (!user) return next(new Error('Failed to load User ' + id));
            req.profile = user;
            next();
        });
};
