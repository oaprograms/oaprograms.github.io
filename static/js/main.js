$(document).ready(function() {
    var $owl = $('.owl');
	$owl.owlCarousel({
        singleItem: true,
        autoPlay: 3000,
        autoWidth:true,
        autoHeight:true
    });
    $(window).scroll(function(){
        $owl.each(function(){
            var $this = $(this);
            var owl = $this.data('owlCarousel');
            if ($this.offset().top > $(window).scrollTop() - 50 && $this.offset().top + $this.height() < $(window).scrollTop() + $(window).height() + 50){
                if(!$this.hasClass('playing')){
                    $this.addClass('playing');
                    owl.play();
                }
            } else {
                $this.removeClass('playing');
                owl.stop();
            }
        })
    });

});