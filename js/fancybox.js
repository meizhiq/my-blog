$(document).ready(function() {
  $('img').each(function() {
    if ($(this).parent().hasClass('fancybox')) return;
    if ($(this).parents().addBack().hasClass('nofancybox')) return;
    var alt = this.alt;
    if (alt) $(this).after('<span class="caption">' + alt + '</span>');
    var src = $(this).attr('data-src') || this.src;
    $(this).wrap('<a href="' + src + '" title="' + alt + '" class="fancybox" data-fancybox="gallery"></a>');
  });
});
