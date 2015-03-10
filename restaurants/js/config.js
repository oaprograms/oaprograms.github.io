"use strict";

app.config([ "RestangularProvider", function (RestangularProvider) {
    RestangularProvider.setRestangularFields({
        id: "id"
    });
    RestangularProvider.setBaseUrl("http://api.reviews-combined.com:80/v1/");
    RestangularProvider.setDefaultRequestParams({
        "access-token": "f899139df5e1059396431415e770c6dd",
        "per-page": 8
    });
    RestangularProvider.setDefaultHttpFields({
        withCredentials: false,
        cache: true
    });
    RestangularProvider.setFullResponse(true);
    RestangularProvider.setRequestInterceptor(function(a, b) {
        if (b === "remove") {
            return null;
        }
        return a;
    });
    RestangularProvider.addResponseInterceptor(function (data, operation, c, d, e, f) {
        if (operation === "getList") {
            data = [
                {
                    items: data.items,
                    _meta: data._meta
                }
            ];
        }
        return data;
    });
} ]);