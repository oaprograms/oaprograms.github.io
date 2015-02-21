var app = angular.module("app", ['ui.bootstrap', 'ui.bootstrap.contextMenu', 'firebase']);
app.controller('MainController', ['$scope', '$modal', '$firebase', 'Calendar', function ($scope, $modal, $firebase, Calendar) {

    $scope.cellTypes = {
        EMPTY: 0,
        START: 1,
        MID: 2,
        END: 3
    };

    // for using from HTML
    $scope.daysInMonth = daysInMonth;
    $scope.monthNames = monthNames;
    $scope.Math = Math;
    $scope.range = range;

    // the cell that is being moved / dragged
    $scope.movingCell = null;

    $scope.tryAccount = {
        username:'oaprograms',
        password: 'UsUF9ZInGGmPE2xUUDkIxR7HXHSeDL4VA076HJ0r',
        repository:'https://tablla.firebaseio.com/'
    };

    $scope.account = {
        username:'',
        password: '',
        repository:'https://tablla.firebaseio.com/'
    };

    $scope.login = function (account) {
        Calendar(account).$bindTo($scope, "boards");
    };

    $scope.scrollLeft = function () {
        if ($scope.calendar.viewMonth > 0) {
            $scope.calendar.viewMonth--;
        } else {
            $scope.calendar.viewYear--;
            $scope.calendar.viewMonth = 11;
        }
    };

    $scope.scrollRight = function () {
        if ($scope.calendar.viewMonth < 11) {
            $scope.calendar.viewMonth++;
        } else {
            $scope.calendar.viewYear++;
            $scope.calendar.viewMonth = 0;
        }
    };

    $scope.addRow = function () {
        $scope.calendar.people.push({name: '(unnamed)'});
        $scope.initView();
    };

    $scope.daysViewDiff = function () {
        if ($scope.calendar && $scope.calendar.viewYear && $scope.calendar.viewMonth) {
            return daysDiff($scope.calendar.viewYear, $scope.calendar.viewMonth, 2015, 0);
        } else {
            return 0;
        }
    };

    $scope.initView = function () {
        // reconstruct scheduler view
        $scope.view = [];
        // add people to view

        // add days for each person
        angular.forEach($scope.calendar.people, function (person, index) {
            var row = [];
            var i = 0;
            var daysDiff = $scope.daysViewDiff();
            for (var month = 0; month < 6; month++) {
                var date_year = $scope.calendar.viewYear + Math.floor((month + $scope.calendar.viewMonth) / 12);
                var date_month = (month + $scope.calendar.viewMonth) % 12;
                var monthDays = daysInMonth(date_year, date_month);
                for (var d = 0; d < monthDays; d++) {
                    var weekend = isWeekend(date_year, date_month, d + 1);
                    row.push(
                        {
                            //color: weekend ? '#5a5a5a' : '#666',
                            weekend: weekend,
                            type: $scope.cellTypes.EMPTY,
                            //month: month + $scope.calendar.viewMonth - 1) % 12,
                            dayInMonth: d,
                            daysInMonth: monthDays,
                            pos: -daysDiff + i++,
                            person: index
                        }
                    );
                }
            }
            $scope.view.push(row);
        });
    };

    $scope.refresh = function (newValue, oldValue) {

        if (!($scope.calendar && $scope.calendar.people)) {
            return;
        }
        if (!$scope.view || $scope.calendar.people.length > $scope.view.length ||
            newValue.viewMonth != oldValue.viewMonth || newValue.viewYear != oldValue.viewYear) {
            $scope.initView();
        }

        // reset view
        angular.forEach($scope.view, function (row) {
            for (i = 0; i < row.length; i++) {
                row[i].color = row[i].weekend ? '#353535' : '#404040';
                row[i].task = null;
                row[i].offset = 0;
                row[i].type = $scope.cellTypes.EMPTY;
                row[i].text = '';
            }
        });

        // add tasks to corresponding cells
        angular.forEach($scope.calendar.tasks, function (task) {
            // task: start, end, color, title, description
            var daysDiff = $scope.daysViewDiff();
            var start = task.start + daysDiff;
            var end = task.end + daysDiff;
            var duration = task.end - task.start;

            for (var i = Math.max(start, 0); i <= end; i++) {
                var cell = $scope.view[task.person][i];
                cell.color = task.color;
                cell.task = task;
                cell.offset = i - start;
                if (i == end) {
                    cell.type = $scope.cellTypes.END;
                } else if (i > start) {
                    cell.type = $scope.cellTypes.MID;
                } else {
                    cell.type = $scope.cellTypes.START;
                    if (duration > 2) {
                        if (task.title.length > 3 && duration * 1.7 - 3 < task.title.length) {
                            cell.text = task.title.substring(0, Math.max(duration * 1.7 - 3, 0)) + '...';
                        } else {
                            cell.text = task.title;
                        }
                    }
                }
            }
        });
    };

    $scope.$watch('boards', function (newValue, oldValue) {
        if (!(oldValue && oldValue.boards && oldValue.boards.length) &&
            (newValue && newValue.boards && newValue.boards.length)) {

            $scope.calendar = newValue.boards[0];
        }
    }, true);

    $scope.$watch('calendar', function (newValue, oldValue) {
        $scope.refresh(newValue, oldValue);
    }, true);

    $scope.mouseDownCell = function ($event) {
        var cell = angular.element($event.target).scope().cell;
        var task = cell.task;
        if (task) {
            // set task as movingTask
            $scope.movingCell = {
                task: task,
                dragType: cell.type, // EMPTY, START, MID
                offset: cell.offset
            };
        }
    };

    $scope.addTaskToPosition = function (cell) {
        if (!$scope.calendar.tasks) $scope.calendar.tasks = [];
        $scope.calendar.tasks.push({
            person: cell.person,
            start: cell.pos,
            end: cell.pos + 2,
            color: '#95a5a6',
            title: '',
            description: ''
        });
    };

    $scope.removeTask = function (task) {
        $scope.calendar.tasks.splice($scope.calendar.tasks.indexOf(task), 1);
    };

    $scope.doubleClick = function ($event) {
        var cell = angular.element($event.target).scope().cell;
        var task = cell.task;
        if (!task) { // add task
            $scope.addTaskToPosition(cell);
        } else { // edit task: not here
            $scope.editTask(task);
        }

    };

    $scope.mouseUpCell = function () {
        $scope.movingCell = null;
    };

    $scope.mouseMoveCell = function ($event) {
        var cell = angular.element($event.target).scope().cell;
        if (cell.task) { // set the appropriate context menu
            $scope.contextMenu = $scope.taskContextMenu;
        } else {
            $scope.contextMenu = $scope.emptyCellContextMenu;
        }
        var movingCell = $scope.movingCell;
        if (cell && movingCell) {
            var daysDiff = $scope.daysViewDiff();
            var currentPos = movingCell.task.start + daysDiff;
            var newPos = cell.pos;

            if (currentPos != newPos) {
                if (movingCell.dragType == $scope.cellTypes.MID) {
                    var duration = movingCell.task.end - movingCell.task.start;
                    movingCell.task.start = newPos - movingCell.offset;
                    movingCell.task.end = newPos - movingCell.offset + duration;
                    movingCell.task.person = cell.person;
                } else if (movingCell.dragType == $scope.cellTypes.END) {
                    if (newPos > movingCell.task.start) movingCell.task.end = newPos;
                } else if (movingCell.dragType == $scope.cellTypes.START) {
                    if (newPos < movingCell.task.end) movingCell.task.start = newPos;
                }
            }
        }
    };

    $scope.taskContextMenu = [
        ['Edit', function ($itemScope) {
            $scope.editTask($itemScope.cell.task);
        }],
        null, // Dividier
        ['Remove', function ($itemScope) {
            $scope.removeTask($itemScope.cell.task);
        }]
    ];

    $scope.emptyCellContextMenu = [
        ['Add Task', function ($itemScope) {
            $scope.addTaskToPosition($itemScope.cell);
        }]
    ];

    $scope.editTask = function (task) {

        var modalInstance = $modal.open({
            templateUrl: 'editTaskModalContent.html',
            controller: 'ModalEditTaskCtrl',
            size: 'sm',
            resolve: {
                task: function () {
                    return task;
                }
            }
        });
    };

    $scope.addBoard = function () {
        var name = prompt("Please enter board name", "board");
        if (name != null && name.length) {
            $scope.boards.boards.push({
                name: name,
                people: [
                    {name: "(unnamed)"}, {name: "(unnamed)"}, {name: "(unnamed)"}
                ],
                tasks: [],
                viewYear: new Date().getFullYear(),
                viewMonth: new Date().getMonth()
            });
            $scope.calendar = $scope.boards.boards[$scope.boards.boards.length - 1];
        }
    };
    $scope.deleteBoard = function () {
        if (confirm("Delete board?")) {
            $scope.boards.boards.splice($scope.boards.boards.indexOf($scope.calendar), 1);
            $scope.calendar = $scope.boards.boards[0];
        }
    };
    $scope.renameBoard = function () {
        var name = prompt("Please enter board name", $scope.calendar.name);
        if (name != null && name.length) {
            $scope.calendar.name = name;
        }
    };
}]);

app.controller('ModalEditTaskCtrl', function ($scope, $modalInstance, task) {

    $scope.colors = ['#1abc9c', '#2ecc71', '#3498db', '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6'];
    $scope.task = task;
    $scope.ok = function () {
        $modalInstance.close(task);
    };
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };

});

app.factory("Calendar", ["$firebase", function ($firebase) {
    return function (account) {
        // create a reference to the user's profile
        var ref = new Firebase(account.repository);
        ref.auth(account.password);
        // return it as a synchronized object
        return $firebase(ref.child(account.username)).$asObject();

    }
}]);
