(function(){
    function initMenu(){
        $('.menu-item-toggle > a').click(function(event){
            event.preventDefault();
            $('.menu-item-toggle').toggleClass('active');
            $('.menu-item-search').removeClass('active');
            $('.search-box').css('display', 'none');
            $('.menu-expandable').slideToggle("fast");
            return false;
        });
        $('.menu-item-search > a').click(function(event){
            event.preventDefault();
            $('.menu-item-search').toggleClass('active');
            $('.menu-item-toggle').removeClass('active');
            $('.menu-expandable').css('display', 'none');
            $('.search-box').slideToggle("fast");
            return false;
        });
        $("a.nav-page-top").click(function(event) {
            event.preventDefault();
            $("html, body").animate({ scrollTop: 0 }, "fast");
        });
    }
    function initCarousel(){
        // init slider
        var slider = $(".header-carousel").unslider({ arrows:false });

        // bind additional prev, next arrow controls for mobile view
        $('.header-mobile-addon .unslider-arrow-addon').click(function(event){
            event.preventDefault();
            if ($(this).hasClass('next')) {
                slider.data('unslider')['next']();
            } else {
                slider.data('unslider')['prev']();
            }
        });
        // we have to sync title (h1 element) with additional title element for mobile view
        function updateAddonTitle(){
            $('.header-mobile-addon .unslider-title').text($('.unslider .unslider-active h1').text());
        }
        // update title on every slide change
        slider.on('unslider.change', function(event, index, slide) {
            updateAddonTitle()
        });
        // initial
        updateAddonTitle();
    }


    initMenu();
    initCarousel();
})();