$(document).ready(function() {
    var owl = {
        singleItem: true,
        autoPlay: 4000,
        autoWidth:true,
        autoHeight:true
    };
	$("#owl1").owlCarousel(owl);
    $("#owl2").owlCarousel(owl);
    $("#owl3").owlCarousel(owl);
    $("#owl4").owlCarousel(owl);
});