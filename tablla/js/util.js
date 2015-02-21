function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function daysDiff(year1, month1, year2, month2) {
    var a = moment({y: year1, M: month1, d: 1});
    var b = moment({y: year2, M: month2, d: 1});
    return b.diff(a, 'days');
}

function isWeekend(year, month, day) {
    var a = moment({y: year, M: month, d: day});
    return a.day() == 0 || a.day() == 6;

}

var monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

function range(start, stop) {
    var a = [start], b = start;
    while (b < stop) {
        b += 1;
        a.push(b)
    }
    return a;
};