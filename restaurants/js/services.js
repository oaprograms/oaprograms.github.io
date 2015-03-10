"use strict";

app.factory("restaurantSvr", ["Restangular", function (Restangular) {
    return {
        getRestaurantCategories: function () {
            var data = Restangular.all("restaurants/category");
            return data.getList().then(function (response) {
                return response.data[0].items;
            });
        },
        getRestaurants: function (page, params) {
            var data = Restangular.all("restaurants/list");
            return data.getList(merge_objects({
                    latitude: -33.8945364,
                    longitude: 151.26898979999999,
                    page: page
                }, params)).then(function (response) {
                    var items = response.data[0].items;
                    for (var i = 0; i < items.length; i++) {
                        var price = "";
                        for (var j = 0; j < items[i].price_range; j++) {
                            price = price + "$";
                        }
                        items[i].price_range_symbol = price;
                    }
                    return {
                        items: items,
                        _meta: response.data[0]._meta
                    };
                });
        }
    };
} ]);