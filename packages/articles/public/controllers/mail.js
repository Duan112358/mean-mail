'use strict';

function DropSheet(opts) {
    if (!opts) opts = {};
    var nullfunc = function() {};
    if (!opts.errors) opts.errors = {};
    if (!opts.errors.badfile) opts.errors.badfile = nullfunc;
    if (!opts.errors.pending) opts.errors.pending = nullfunc;
    if (!opts.errors.failed) opts.errors.failed = nullfunc;
    if (!opts.errors.large) opts.errors.large = nullfunc;
    if (!opts.on) opts.on = {};
    if (!opts.on.workstart) opts.on.workstart = nullfunc;
    if (!opts.on.workend) opts.on.workend = nullfunc;
    if (!opts.on.sheet) opts.on.sheet = nullfunc;
    if (!opts.on.wb) opts.on.wb = nullfunc;

    var rABS = typeof FileReader !== 'undefined' && typeof FileReader.prototype !== 'undefined' && typeof FileReader.prototype.readAsBinaryString !== 'undefined';
    var useworker = typeof Worker !== 'undefined';
    var pending = false;

    function fixdata(data) {
        var o = "",
            l = 0,
            w = 10240;
        for (; l < data.byteLength / w; ++l)
            o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w, l * w + w)));
        o += String.fromCharCode.apply(null, new Uint8Array(data.slice(o.length)));
        return o;
    }

    function sheetjsw(data, cb, readtype, xls) {
        pending = true;
        opts.on.workstart();
        var dropsheetPath = 'public/system/excel/';
        var worker = new Worker(dropsheetPath + 'sheetjsw.js');
        worker.onmessage = function(e) {
            switch (e.data.t) {
                case 'ready':
                    break;
                case 'e':
                    pending = false;
                    console.error(e.data.d);
                    break;
                case 'xls':
                case 'xlsx':
                    pending = false;
                    opts.on.workend();
                    cb(JSON.parse(e.data.d), e.data.t);
                    break;
            }
        };
        worker.postMessage({
            d: data,
            b: readtype,
            t: xls ? 'xls' : 'xlsx'
        });
    }

    var last_wb, last_type;
    window.colspan = {
        span: []
    };

    function to_json(workbook, type) {
        var XL = type.toUpperCase() === 'XLS' ? XLS : XLSX;
        if (useworker && workbook.SSF) XLS.SSF.load_table(workbook.SSF);
        var result = {};
        workbook.SheetNames.forEach(function(sheetName) {
            var roa = XL.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
            if (roa.length > 0) result[sheetName] = roa;
        });
        return result;
    }

    function get_columns(sheet, type) {
        var val, rowObject, range, columnHeaders, emptyRow, C;
        if (!sheet['!ref']) return [];
        range = XLS.utils.decode_range(sheet["!ref"]);
        columnHeaders = [];

        for (C = range.s.c; C <= range.e.c; ++C) {
            val = sheet[XLS.utils.encode_cell({
                c: C,
                r: 0
            })];
            if (!val) {
                if (!colspan.start) {
                    colspan.start = C - 1;
                }
                val = sheet[XLS.utils.encode_cell({
                    c: C,
                    r: 1
                })];

                if (!val) {
                    continue;
                }
            } else {
                if (colspan.start) {
                    colspan.span.push({
                        start: colspan.start,
                        end: C - 1
                    });
                    colspan.start = false;
                }
            }
            columnHeaders[C] = type.toLowerCase() == 'xls' ? XLS.utils.format_cell(val) : val.v;
            //console.log(val, columnHeaders[C]);
        }
        colspan.totalCol = columnHeaders.length;
        return columnHeaders;
    }

    function choose_sheet(sheetidx) {
        process_wb(last_wb, last_type, sheetidx);
    }

    function process_wb(wb, type, sheetidx) {
        last_wb = wb;
        last_type = type;
        opts.on.wb(wb, type, sheetidx);
        var sheet = wb.SheetNames[sheetidx || 0];
        if (type.toLowerCase() == 'xls' && wb.SSF) XLS.SSF.load_table(wb.SSF);
        var json = to_json(wb, type)[sheet],
            cols = get_columns(wb.Sheets[sheet], type);
        opts.on.sheet(json, cols, wb.SheetNames, choose_sheet);
    }

    function handleDrop(e) {
        e.stopPropagation();
        e.preventDefault();
        if (pending) return opts.errors.pending();
        var files = e.dataTransfer.files;
        var i, f;
        for (i = 0, f = files[i]; i != files.length; ++i) {
            var reader = new FileReader();
            var name = f.name;
            reader.onload = function(e) {
                var data = e.target.result;
                var wb, arr, xls;
                var readtype = {
                    type: rABS ? 'binary' : 'base64'
                };
                if (!rABS) {
                    arr = fixdata(data);
                    data = btoa(arr);
                }
                xls = [0xd0, 0x3c].indexOf(data.charCodeAt(0)) > -1;
                if (!xls && arr) xls = [0xd0, 0x3c].indexOf(arr[0].charCodeAt(0)) > -1;
                if (rABS && !xls && data.charCodeAt(0) !== 0x50)
                    return opts.errors.badfile();

                function doit() {
                    try {
                        if (useworker) {
                            sheetjsw(data, process_wb, readtype, xls);
                            return;
                        }
                        if (xls) {
                            wb = XLS.read(data, readtype);
                            process_wb(wb, 'XLS');
                        } else {
                            wb = XLSX.read(data, readtype);
                            process_wb(wb, 'XLSX');
                        }
                    } catch (e) {
                        opts.errors.failed(e);
                    }
                }

                if (e.target.result.length > 500000) opts.errors.large(e.target.result.length, function(e) {
                    if (e) doit();
                });
                else {
                    doit();
                }
            };
            if (rABS) reader.readAsBinaryString(f);
            else reader.readAsArrayBuffer(f);
        }
    }

    function handleDragover(e) {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }

    if (opts.drop.addEventListener) {
        opts.drop.addEventListener('dragenter', handleDragover, false);
        opts.drop.addEventListener('dragover', handleDragover, false);
        opts.drop.addEventListener('drop', handleDrop, false);
    } else {
        console.log(opts.drop);
    }

};


var module = angular.module('mean');

module.directive('dropSheet', ['$rootScope', 'ngSocket',
    function($rootScope, socket) {
        return {
            restrict: 'AC',
            link: function(scope, elem, attrs) {
                var spinner,
                    sending_spinner,
                    $container = $('.hot'),
                    $parent = elem.parent();
                var _handsontable;


                alertify.set({
                    labels: {    
                        ok : '确定',
                        cancel: '取消'
                    }
                });


                function make_buttons(sheetnames, cb) {
                    var $buttons = $('.buttons');
                    if ($buttons.html()) {
                        return;
                    }
                    sheetnames.forEach(function(s, idx) {
                        var button = $('<button/>').attr({
                            type: 'button',
                            name: 'btn' + idx,
                            class: 'btn',
                            text: s
                        });
                        button.append('<b>' + s + '</b>');
                        button.unbind('click');
                        button.click(function() {
                            $('.btn-primary').removeClass('btn-primary');
                            $(this).addClass('btn-primary');
                            cb(idx);
                        });
                        $buttons.append(button);
                    });

                    $buttons.append($('<button class="send btn btn-danger" ng-click="sendMail()">发送邮件</button>'));
                    if (!$('.btn-primary').length) {
                        $('.btn:first-child').addClass('btn-primary');
                    }
                };

                function _onsheet(json, cols, sheetnames, select_sheet_cb) {
                    make_buttons(sheetnames, select_sheet_cb);
                    /* add header row for table */
                    if (!json) json = [];

                    json.unshift(function(head) {
                        var o = {};
                        for (var i = 0; i != head.length; ++i) {
                            o[head[i]] = head[i];
                        }
                        return o;
                    }(cols));

                    $container.handsontable({
                        data: json,
                        fixedRowsTop: 1,
                        stretchH: 'all',
                        rowHeaders: false,
                        contextMenu: true,
                        columns: cols.map(function(x) {
                            return {
                                data: x
                            };
                        }),
                        colHeaders: cols.map(function(x, i) {
                            var headers = XLS.utils.encode_col(i);
                            return headers;
                        }),
                        isEmptyRow: function(row) {
                            var data = json[row];
                            return isEmptyRow(data);
                        },
                        cells: function(r, c, p) {
                            if (r === 0) {
                                this.renderer = function(instance, td, row, col, prop, value, cellProperties) {
                                    Handsontable.TextCell.renderer.apply(this, arguments);
                                    $(td).css({
                                        'font-weight': 'bold'
                                    });
                                }
                            }
                        },
                        width: function() {
                            return $parent.width();
                        },
                        height: function() {
                            return $(window).height() - 100;
                        },
                    });

                    $('.send').unbind('click');
                    $('.send').click(function() {
                        sending_spinner = new Spinner().spin($('.htCore')[0]);

                        $('.send').attr('disabled', true);
                        $('.htCore').css('opacity', '.3');
                        var data = _.reject(json, isEmptyRow);
                        socket.emit('__send__all__mails__', data);
                    });
                };

                socket.on("__all__sent__", function(head) {
                    var targets = $('.htCore tr').slice(head + 1);
                    var removed = false;
                    targets.hide(1000, function() {
                        if (!removed) {
                            sending_spinner.stop();
                            $(".send").attr("disabled", false);
                            $(".htCore").css("opacity", "1");
                            alertify.success("所有邮件已成功发送！");
                            removed = true;
                            if (!_handsontable) {
                                _handsontable = $('.hot').handsontable('getInstance');
                            }
                            _handsontable.alter('remove_row', head, targets.length);
                        }

                    });
                });

                socket.on("__mail__sent__", function(index) {
                    if (!_handsontable) {
                        _handsontable = $('.hot').handsontable('getInstance');
                    }
                    _handsontable.alter("remove_row", index);
                });

                socket.on("__error__", function(err) {
                    sending_spinner.stop();

                    if (err.status == 101) {
                        alertify.alert(err.msg);
                    }
                    console.log(err);
                });


                function isEmptyRow(row) {
                    if (!_.isEmpty(row)) {
                        var values = _.values(row);
                        return !_.reject(values, function(val) {
                            return _.isNull(val) || _.isEmpty(val);
                        }).length;
                    }
                    return true;
                }

                DropSheet({
                    drop: elem[0],
                    on: {
                        workstart: function() {
                            spinner = new Spinner().spin(elem[0]);
                            $('.buttons').hide();
                            $('.hot').css('opacity', 0);
                        },
                        workend: function() {
                            spinner.stop();
                            elem.fadeOut(1000, function() {
                                $('.buttons, .hot').show(800, function() {
                                    $('.hot').css('opacity', 1);
                                });
                            });
                        },
                        sheet: _onsheet
                    },
                    errors: {
                        badfile: function() {
                            alertify.alert('亲，这看上去并不是一个Excel文件，你没搞错吧？', function() {});
                        },
                        pending: function() {
                            alertify.alert('正在处理中...', function() {});
                        },
                        failed: function(e) {
                            console.log(e.stack);
                        },
                        large: function(len, cb) {
                            alertify.confirm('亲，这个文件看上去有点大(' + (len / 1024) + ' M)，如果你确定要处理的话，浏览器可能会在处理时无响应，这时请耐心等待。', cb);
                        }
                    }
                });
            }
        };
    }
])


module.controller('MailController', ['$scope', '$stateParams', '$location', 'Global', 'ngSocket',
    function($scope, $stateParams, $location, Global, socket) {
        $scope.global = Global;

        $scope.hasAuthorization = function(article) {
            if (!article || !article.user) return false;
            return $scope.global.isAdmin || article.user._id === $scope.global.user._id;
        };

        $scope.sendMail = function() {
            alertify.alert('I got it');
        }

    }
]);
