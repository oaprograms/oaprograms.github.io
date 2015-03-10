"use strict";

function merge_objects(a, b) {
    var merged = {};
    for (var p1 in a) {
        merged[p1] = a[p1];
    }
    for (var p2 in b) {
        merged[p2] = b[p2];
    }
    return merged;
}