'use strict';

var nodemailer = require('nodemailer');
var _ = require('underscore');
var crypto = require('crypto');
var async = require('async');
var utils = require('./utils');


module.exports = function(mails, socket) {
    var auth = socket.conn.request.user;

    var _table_header;
    var _mail_subject;
    var _mail_title;

    var header_tpl = '<!doctype html>' +
        '<html lang="en">' +
        '<head>' +
        '<meta http-equiv="Content-Type" content="text/html;charset=UTF-8">' +
        '<title>工资明细</title>' +
        '</head>' +
        '<style>' +
        '.content {    margin: 15px;padding:0;font:14px/normal Microsoft Yahei;}' +
        '.table {border-collapse: collapse;border-spacing:0;margin:10px 0;width:100%;}' +
        '.th, .td {border: solid 2px #000;min-width: 70px;text-align:center;}' +
        '.th {background-color: #cccccc;font-weight: 800px;}' +
        '.footer {margin:10px 0;}' +
        '</style>';

    var footer_tpl = '<div class="footer">';


    function initMsg(from, to, cc, html) {
        var date = new Date();
        var month = date.getMonth();
        var subject = _mail_subject || (month ? month : 12) + '月份工资单';
        var message = {
            from: from,
            to: to,
            cc: cc,
            subject: subject,
            headers: {
                'X-Laziness-level': 1000
            },
            text: subject,
            html: html
        };
        return message;
    }

    function generateFooter(keys, data) {
        var titleIndex = 0;
        for (var tIndex in data) {
            var item = data[tIndex];
            titleIndex++;
            if (titleIndex == 1) {
                _mail_subject = item[keys[0]];
                //socket.emit("__mail__sent__", tIndex);
                continue;
            }
            if (titleIndex == 2) {
                _mail_title = item[keys[0]];
                header_tpl += '<body class=\"content\"><div><h3>' + _mail_title + '</h3>';
                //socket.emit('__mail__sent__', tIndex);
                continue;
            }
            var comm = item[keys[0]] || '&nbsp;';
            var font = item[keys[1]] || 'h3';

            footer_tpl += '<' + font + '>' + comm + '</' + font + '>';
            //socket.emit("__mail__sent__", tIndex);
        }
        footer_tpl += '</div></body></html>';
    }

    function extractDataAndHeader(data) {
        // generate header body
        var thdata = data[0];
        var hkeys = _.keys(thdata);
        var hrow = 2;
        if (isMergedHeader(data)) {
            var subthdata = data[1];
            delete thdata[hkeys[hkeys.length - 1]];
            delete thdata[hkeys[hkeys.length - 2]];
            _table_header = generateHeader(thdata, subthdata);
            data.splice(0, 2); //remove header data
        } else {
            hrow = 1;
            delete thdata[hkeys[hkeys.length - 1]];
            delete thdata[hkeys[hkeys.length - 2]];
            _table_header = generateHeader(thdata, false);
            data.splice(0, 1); //remove header data
        }

        var _footer = _.filter(data, function(item) {
            return _.isEmpty(item[hkeys[0]]);
        });

        generateFooter(hkeys.slice(1, 3), _footer, socket);
        return {
            body: _.difference(data, _footer),
            header: thdata,
            hrow: hrow
        };
    }

    function generateHeader(header, subheader) {
        if (!header) {
            return '';
        }
        var content = '<table class="table"><thead>';
        var thead = '<tr>';

        if (!subheader || !_.keys(subheader).length) {
            content += "<tr>";
            for (var th in header) {
                content += '<th align="center" valign="center" border="2" cellpadding="0" cellspacing="0" width="70" class="th">' + th + '</th>';
            }
            content += '</tr></thead>';
        }

        var subthead = '';
        var previous = '';
        var colspan = 0;
        var mergeheader = '';
        for (var th in header) {
            if (_.has(subheader, th)) {
                if (!subthead) {
                    subthead = '<tr>';
                }
                if (subheader[th] != th) { //merge cell
                    if (colspan) {
                        thead += '<th border="2" cellpadding="0" cellspacing="0" class="merged-header th" colspan=' + colspan + '>' + mergeheader + '</th>';
                    }
                    colspan = 0;
                    mergeheader = th;
                }

                colspan++;
                subthead += '<th border="2" cellpadding="0" cellspacing="0" width="70" class="th">' + subheader[th] + '</th>';
            } else {
                if (colspan) {
                    thead += '<th border="2" cellpadding="0" cellspacing="0" class="merged-header th" colspan=' + colspan + '>' + mergeheader + '</th>';
                    mergeheader = "";
                }
                thead += '<th border="2" cellpadding="0" cellspacing="0" class="merged-header th" rowspan=2>' + th + '</th>';

                colspan = 0;
            }
        }

        content += thead + '</tr>';
        if (subheader) {
            content += subthead + '</tr>';
        }

        content += '</thead>';
        return content;
    }

    function generateBody(header, item) {
        var body = '<tbody><tr>';
        for (var h in header) {
            body += '<td border="2" cellpadding="0" cellspacing="0" width="70"  class="td">' + (item[h] || '') + '</td>';
        }
        body += '</tr></tbody></table>';
        return body;
    }


    /**
     *  @jsdoc validate merge header by check sencond row's first cell is null or not
     */

    function isMergedHeader(data) {
        var header = data[0];
        var sencondRow = data[1];

        var firstKey = _.keys(header)[0];
        if (!sencondRow[firstKey]) {
            return true;
        }
        return false;
    }


    if (mails.length < 2 || (isMergedHeader(mails) && mails.length == 2)) {
        console.log('empty collection');
        socket.emit('__error__', {
            status: 101,
            msg: '没有可处理的数据'
        });
        return;
    }

    utils.getUser(auth._id, function(err, user) {
        if (err) {
            console.log(err);
            socket.emit('__error__', 'Permission denied!');
        } else
        if (!user) {
            socket.emit('__error__', 'Failed to load User :' + auth.username);
        } else {
            var transport = nodemailer.createTransport("SMTP", {
                service: "QQex",
                auth: {
                    user: user.email,
                    pass: utils.decipherPass(user)
                }
            });

            var _result = extractDataAndHeader(mails, socket);
            var thdata = _result.header;
            var hrow_count = _result.hrow;
            mails = _result.body;

            var tindex;
            var haserror = false;
            var total = mails.length;
            var sentCount = 0;

            async.each(mails, function(item) {
                var tbody = header_tpl + _table_header + generateBody(thdata, item) + footer_tpl;
                var from = auth.email;
                var keys = _.keys(item);
                var to = item[keys[keys.length - 2]];
                var cc = item[keys[keys.length - 1]];

                var msg = initMsg(from, to, cc, tbody);

                (function(message, mail) {
                    transport.sendMail(msg, function(err) {
                        if (err) {
                            if (!haserror) {
                                utils.log(mail, user, err);
                                console.log(err);
                            }
                        } else {
                            var index = mails.indexOf(mail);
                            mails.splice(index, 1);
                            socket.emit('__mail__sent__', index + hrow_count);
                            if (!mails.length) {
                                socket.emit("__all__sent__", hrow_count);
                            }
                        }
                    });
                })(msg, item);
            });
        }
    });
};
