"use strict";

app.controller('MainCtrl', ['$scope', 'restaurantSvr', function ($scope, restaurantSvr) {

    $scope.init = function () {
        $scope.filters = { // this object contains all search parameters
            sort: "popular",
            'price_range-greater-than-or-equal-to': 0,
            'price_range-less-than-or-equal-to': 4
        };
        $scope.popularListCurrentPage = 0; // current page

        $scope.listedCategories = {
            'Indian': false,
            'Indonesian Restaurant': false,
            'Thai': false,
            'Italian': false,
            'Cafe': false,
            'Modern Australian': false,
            'African': false,
            'Vegetarian': false
        };

        $scope.allCategoriesSelected = true;
        $scope.ratingFilterValue = 0;
        $scope.distanceFilterValue = 0;

        $scope.getAllCategories();
        $scope.getRestaurants(0);

    };

    $scope.getRestaurants = function (page) {
        if (typeof page !== "undefined") {
            $scope.popularListCurrentPage = page;
        }
        restaurantSvr.getRestaurants($scope.popularListCurrentPage, $scope.filters).then(function (r) {
            $scope.restaurants = r.items;
            $scope.maxSize = 6;
            $scope.popularListItemPerPage = 8;
            $scope.popularListTotalItems = r._meta.totalCount;
            $scope.popularListCurrentPage = r._meta.currentPage + 1;
            $scope.numPages = r._meta.pageCount;
        });
    };

    $scope.$watch('filters', function () {
        $scope.getRestaurants(0);
    }, true); // true = watch nested objects too

    $scope.$watch('listedCategories', function () {
        var categoryIn = null;
        angular.forEach($scope.listedCategories, function (val, key) {
            if (val === true) {
                if (categoryIn === null) {
                    categoryIn = key
                } else {
                    categoryIn += ',' + key;
                }
            }
        });
        $scope.filters['category-in'] = categoryIn;
        if (categoryIn == null) {
            delete $scope.filters['category-in']; // if none, show all
        }
    }, true); // true = watch nested objects too

    $scope.selectAllCategories = function (value) {
        angular.forEach($scope.listedCategories, function (val, key) {
            $scope.listedCategories[key] = false;
        });
    };

    $scope.getAllCategories = function () {
        restaurantSvr.getRestaurantCategories().then(function (r) {
            $scope.allCategories = r;
        });
    };

    $scope.addCategory = function (category) {
        $scope.listedCategories[category] = true;
        $scope.newCategory = null;
    };

    $scope.setRatingFilter = function (value) {
        if (value == 0) { // all ratings
            delete $scope.filters['percentile-greater-than-or-equal-to'];
            delete $scope.filters['percentile-less-than-or-equal-to'];
        } else if (value == 1) { // < 60%
            delete $scope.filters['percentile-greater-than-or-equal-to'];
            $scope.filters['percentile-less-than-or-equal-to'] = 60
        } else {
            delete $scope.filters['percentile-less-than-or-equal-to'];
            $scope.filters['percentile-greater-than-or-equal-to'] = value
        }
    };

    $scope.setDistanceFilter = function (value) {
        if (value == 0) { // all ratings
            delete $scope.filters['distance-greater-than-or-equal-to'];
            delete $scope.filters['distance-less-than-or-equal-to'];
        } else if (value < 0) { // < 60%
            delete $scope.filters['distance-less-than-or-equal-to'];
            $scope.filters['distance-greater-than-or-equal-to'] = -value
        } else {
            delete $scope.filters['distance-greater-than-or-equal-to'];
            $scope.filters['distance-less-than-or-equal-to'] = value
        }
    };

    $scope.init();

}]);
