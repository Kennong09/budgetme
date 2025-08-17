// Import jQuery
import $ from "jquery";
// Import popper.js (required by Bootstrap)
import "popper.js";
// Import Bootstrap JavaScript
import "bootstrap";

declare global {
  interface Window {
    jQuery: typeof $;
    $: typeof $;
  }

  interface JQuery {
    collapse(action: string): JQuery;
  }
}
window.jQuery = window.$ = $;

// Initialize SB Admin Scripts
$(document).ready(function () {
  // Toggle the side navigation
  $("#sidebarToggle, #sidebarToggleTop").on(
    "click",
    function (e: JQuery.ClickEvent) {
      $("body").toggleClass("sidebar-toggled");
      $(".sidebar").toggleClass("toggled");
      if ($(".sidebar").hasClass("toggled")) {
        $(".sidebar .collapse").collapse("hide");
      }
    }
  );

  // Close any open menu accordions when window is resized below 768px
  $(window).resize(function () {
    const windowWidth = $(window).width();
    if (windowWidth !== undefined && windowWidth < 768) {
      $(".sidebar .collapse").collapse("hide");
    }
  });

  // Prevent the content wrapper from scrolling when the fixed side navigation hovered over
  $("body.fixed-nav .sidebar").on(
    "mousewheel DOMMouseScroll wheel",
    function (e: JQuery.TriggeredEvent) {
      const windowWidth = $(window).width();
      if (windowWidth !== undefined && windowWidth > 768) {
        const e0 = e.originalEvent as WheelEvent;
        const delta = e0.deltaY ? -e0.deltaY : e0.detail;
        this.scrollTop += (delta < 0 ? 1 : -1) * 30;
        e.preventDefault();
      }
    }
  );

});

