"use strict";

app.filter('pricerange', function () {
    return function (input) {
        var range = parseInt(input) || 0;
        var out = '';
        for (var i = 0; i <= range; i++) {
            out += '$'
        }
        return out;
    };
});