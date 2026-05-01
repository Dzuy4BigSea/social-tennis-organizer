<?php
/**
 * Add this to your theme's functions.php (or a custom plugin).
 * Then place [tennis_tournament] on any WordPress page or Beaver Builder layout.
 */

add_action('wp_enqueue_scripts', function () {
    // Only load on pages that use the shortcode
    global $post;
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'tennis_tournament')) {
        // Tailwind CDN
        wp_enqueue_script(
            'tailwindcss',
            'https://cdn.tailwindcss.com',
            [],
            null,
            false
        );
        // React app bundle
        wp_enqueue_script(
            'tennis-app',
            '/tennis/app.js',
            [],
            null,
            true  // load in footer
        );
    }
});

add_shortcode('tennis_tournament', function () {
    return '<div id="tennis-app-root" style="min-height:90vh;"></div>';
});
